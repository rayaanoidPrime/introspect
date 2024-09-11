import json
import os
import time
import asyncio
import functools
import airbyte as ab
import pandas as pd
import pika
from io import StringIO
from utils_logging import LOGGER, save_and_log
from utils_md import convert_data_type_postgres
from db_utils import update_parsed_tables_db, update_parsed_tables
from generic_utils import make_request


rabbitmq_host = os.environ.get("RABBITMQ_HOST", "localhost")
parameters = pika.ConnectionParameters(host=rabbitmq_host)
connection = pika.BlockingConnection(parameters)
channel = connection.channel()

# Declare a queue
queue_name = "google_analytics"
channel.queue_declare(queue=queue_name)

DEFOG_BASE_URL = os.environ.get("DEFOG_BASE_URL", "https://api.defog.ai")
STREAMS = [
        "pages",
        "traffic_sources",
        "events_report",
        "locations",
        "devices",
        "daily_active_users",
        "weekly_active_users",
        "four_weekly_active_users",
        "website_overview",
        "pages_path_report",
        "demographic_country_report",
        "demographic_age_report",
        "tech_browser_report",
    ]

def get_google_analytics_data(ga_property_ids: list, ga_creds_content: dict, data_start_date: str ="1900-01-01") -> dict:
    try:
        source = ab.get_source(
            "source-google-analytics-data-api",
            install_if_missing=True,
            config={
                "property_ids": ga_property_ids,
                "credentials": {
                    "credentials_json": json.dumps(ga_creds_content),
                    "auth_type": "Service",
                },
                "date_ranges_start_date": data_start_date,
            },
        )
    except Exception as e:
        LOGGER.error(f"Error in creating Google Analytics source: {str(e)}")
        return {"error": str(e)}

    try:
        source.check()
    except Exception as e:
        LOGGER.error(f"Error in accessing Google Analytics data: {str(e)}")
        return {"error": str(e)}

    cache = ab.get_default_cache()
    source.select_streams(STREAMS)
    result = source.read(cache=cache)

    csv_dict = {}
    # clean all streams
    for stream in STREAMS:
        df = cache.get_pandas_dataframe(stream)
        if df.empty:
            LOGGER.info(f"Empty dataframe for stream: {stream}")
            continue
        cols_to_drop = [
            "_airbyte_raw_id",
            "_airbyte_raw_id",
            "_airbyte_meta",
            "property_id",
            "_airbyte_extracted_at",
        ]
        existing_cols_to_drop = [col for col in cols_to_drop if col in df.columns]
        df = df.drop(columns=existing_cols_to_drop)
        csv_dict[stream] = df.to_csv(index=False)
    
    return csv_dict


def sync(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        return asyncio.get_event_loop().run_until_complete(f(*args, **kwargs))
    return wrapper


@sync
async def callback(ch, method, properties, body):
    """
    Process the get_google_analytics_data queue
    This callback expects the following fields in the payload:
    - api_key: str
    - ga_property_ids: list
    - ga_creds_content: dict
    - data_start_date: str

    The callback will:
    - Get Google Analytics data from the relevant streams
    - Drop unnecessary columns from the data
    - Parse the data into a dictionary of CSV strings
    - Update the parsed_tables database with the new tables
    - Update the parsed_tables table entries in the internal db
    - Update the metadata for the api_key in the defog db
    """
    payload = json.loads(body)
    LOGGER.info(f"Received message")
    api_key = payload["api_key"]
    ga_property_ids = payload["ga_property_ids"]
    ga_creds_content = payload["ga_creds_content"]
    data_start_date = payload["data_start_date"]

    try:
        ts, timings = time.time(), []
        csv_dict = get_google_analytics_data(
            ga_property_ids, ga_creds_content, data_start_date
        )
        save_and_log(ts, "Retrieved google analytics data", timings)
    except Exception as e:
        LOGGER.error(f"Error in getting Google Analytics data: {str(e)}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    
    if not csv_dict:
        LOGGER.info("No data retrieved")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    
    inserted_tables = {}
    for table_index, (table_name, csv_data) in enumerate(csv_dict.items()):
        # read csv data into a pandas dataframe
        df = pd.read_csv(StringIO(csv_data))

        # convert date column to datetime
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], format="%Y%m%d")

        # get data types of columns
        data_types = df.dtypes.astype(str).to_list()
        data_types = [convert_data_type_postgres(dtype) for dtype in data_types]

        # convert csv string to list
        csv_data = csv_data.split("\n")
        csv_data = [row.split(",") for row in csv_data]

        # update parsed_tables database with the new tables
        update_parsed_tables_db(table_name, csv_data)
        inserted_tables[table_name] = [
            {"data_type": data_type, "column_name": col_name, "column_description": ""}
            for data_type, col_name in zip(data_types, df.columns)
        ]

        # update parsed_tables table entries in internal db
        url = f"google_analytics_{table_name}"
        update_parsed_tables(url, table_index, table_name, table_description=None)

    # get and update metadata for {api_key}-parsed
    try:
        response = await make_request(
            DEFOG_BASE_URL + "/get_metadata", {"api_key": api_key, "parsed": True}
        )
    except Exception as e:
        LOGGER.error(f"Error in getting metadata for api_key {api_key}: {str(e)}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    md = response.get("table_metadata", {})
    md.update(inserted_tables)

    try:
        response = await make_request(
            DEFOG_BASE_URL + "/update_metadata",
            {"api_key": api_key, "table_metadata": md, "parsed": True},
        )
        if response.get("status") == "success":
            LOGGER.info(f"Updated metadata for api_key {api_key}-parsed with google analytics data")
        else:
            LOGGER.error(f"Error in updating metadata for api_key {api_key}: {response}")
    except Exception as e:
        LOGGER.error(f"Error in updating metadata for api_key {api_key}: {str(e)}")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return
    
    ch.basic_ack(delivery_tag=method.delivery_tag)


channel.basic_consume(
    queue=queue_name,
    on_message_callback=callback,
    auto_ack=False,
)

print(f" [*] Waiting for messages in the {queue_name} queue...", flush=True)
channel.start_consuming()
