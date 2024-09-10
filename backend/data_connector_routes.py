import os
import json
import time
import pandas as pd
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from datetime import datetime
from io import StringIO
from pydantic import BaseModel, Field
from typing import Optional
from utils_logging import LOGGER, save_timing, save_and_log
from db_utils import validate_user, update_parsed_tables_db, update_parsed_tables
from generic_utils import make_request, get_api_key_from_key_name
from utils_md import convert_data_type_postgres

router = APIRouter()

DEFOG_BASE_URL = os.environ.get("DEFOG_BASE_URL", "https://api.defog.ai")
PARSED_TABLES_DBNAME = os.environ.get("PARSED_TABLES_DBNAME", "defog_local")


class DataConnectorRequest(BaseModel):
    """
    Request body for data connector endpoints.
    """

    key_name: str
    token: str
    data_start_date: Optional[str] = Field(
        default="1900-01-01", description="Start date for data retrieval"
    )


@router.post("/connector/get_google_analytics_data")
async def get_google_analytics_data(request: DataConnectorRequest):
    """
    Connect to Google Analytics, retrieve data and store in parsed_tables in the database.
    """
    key_name = request.key_name
    token = request.token
    data_start_date = request.data_start_date
    ga_creds_path = os.environ.get("GOOGLE_ANALYTICS_CREDS_PATH", None)
    ga_property_ids = os.environ.get("GOOGLE_ANALYTICS_PROPERTY_IDS", None)
    username = validate_user(token, user_type=None, get_username=True)
    api_key = get_api_key_from_key_name(key_name)
    if not username:
        return JSONResponse(
            status_code=401,
            content={
                "error": "unauthorized",
                "message": "Invalid username or password",
            },
        )
    if not ga_creds_path:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Server Error",
                "message": "GOOGLE_ANALYTICS_CREDS_PATH env var not set",
            },
        )
    if not ga_property_ids:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Server Error",
                "message": "GOOGLE_ANALYTICS_PROPERTY_IDS env var not set",
            },
        )
    else:
        ga_property_ids = ga_property_ids.split(",")
    # check that the data_start_date is in the correct format YYYY-MM-DD
    try:
        datetime.strptime(data_start_date, "%Y-%m-%d")
    except ValueError:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Bad Request",
                "message": "data_start_date must be in the format YYYY-MM-DD",
            },
        )
    body = {}
    body["api_key"] = get_api_key_from_key_name(key_name)
    body["ga_property_ids"] = ga_property_ids
    body["data_start_date"] = data_start_date
    with open(ga_creds_path, "r") as f:
        ga_creds_content = json.load(f)
    body["ga_creds_content"] = ga_creds_content
    ts, timings = time.time(), []
    response = await make_request(
        DEFOG_BASE_URL + "/connector/get_google_analytics_data", body
    )
    if "error" in response:
        return JSONResponse(status_code=500, content=response)
    csv_dict = response.get("csv_dict")
    save_and_log(ts, "Retrieved google analytics data", timings)
    if not csv_dict:
        return JSONResponse(
            status_code=200,
            content={"status": "success", "message": "No data retrieved"},
        )

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
    response = await make_request(
        DEFOG_BASE_URL + "/get_metadata", {"api_key": api_key, "parsed": True}
    )
    md = response.get("table_metadata", {})
    md.update(inserted_tables)
    response = await make_request(
        DEFOG_BASE_URL + "/update_metadata",
        {"api_key": api_key, "table_metadata": md, "parsed": True},
    )

    if response.get("status") == "success":
        LOGGER.info(f"Updated metadata for api_key {api_key}: {md}")
        return JSONResponse(status_code=200, content={"status": "success"})
    else:
        LOGGER.error(f"Failed to update metadata for api_key {api_key}: {response}")
        return JSONResponse(
            status_code=500,
            content={"error": "Server Error", "message": "Failed to update metadata"},
        )
