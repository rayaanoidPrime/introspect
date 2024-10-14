# This script is meant to be run within the backend directory inside the docker
# container, or anywhere the self-hosted postgres database is running.

import requests
import json

base_url = "http://0.0.0.0:1235"

# insert data into the following tables
# "web_analytics": [
#             {
#                 "data_type": "character varying",
#                 "column_name": "card_number",
#                 "column_description": "Card number associated with purchase"
#             },
#             {
#                 "data_type": "character varying",
#                 "column_name": "product_purchased_name"
#             },
#             {
#                 "data_type": "double precision",
#                 "column_name": "product_price",
#                 "column_description": "Price of product in US$"
#             },
#             {
#                 "data_type": "timestamp without time zone",
#                 "column_name": "purchase_datetime"
#             }
#         ],
#         "product_purchases": [
#             {
#                 "data_type": "text",
#                 "column_name": "product_name",
#                 "column_description": "The name of the product purchased."
#             },
#             {
#                 "data_type": "int",
#                 "column_name": "card_number",
#                 "column_description": "The card number used for the purchase."
#             },
#             {
#                 "data_type": "integer",
#                 "column_name": "price",
#                 "column_description": "The price of a single unit of the product."
#             },
#             {
#                 "data_type": "integer",
#                 "column_name": "quantity",
#                 "column_description": "The quantity of the product purchased."
#             },
#             {
#                 "data_type": "date",
#                 "column_name": "date_purchased",
#                 "column_description": "The date the product was purchased in `YYYY-MM-DD` format."
#             }
#         ]

payload = json.dumps(
    {
        "api_key": "123",
        "data": [
            [
                "product_purchased_name",
                "product_price",
                "purchase_datetime",
                "card_number",
            ],
            ["apple", "1.00", "2021-01-01", "4111111111111111"],
            ["banana", "0.50", "2021-01-02", "378282246310005"],
            ["cherry", "2.00", "2021-01-03", "6011000990139424"],
            ["durian", "5.00", "2021-01-04", "3530111333300000"],
            ["elderberry", "3.00", "2021-01-05", "5555555555554444"],
        ],
        "link": "https://example.com",
        "table_index": 0,
        "table_name": "web_analytics",
        "table_description": "This table contains data of customer purchases tied to a given card number",
    }
)
headers = {"Content-Type": "application/json"}

response = requests.request(
    "POST", f"{base_url}/import_table/create", headers=headers, data=payload
)

print(response.text)

payload = json.dumps(
    {
        "api_key": "123",
        "data": [
            ["product_name", "card_number", "price", "quantity", "date_purchased"],
            ["apple", "4111111111111111", "1", "5", "2021-01-01"],
            ["banana", "378282246310005", "0.50", "10", "2021-01-02"],
            ["cherry", "6011000990139424", "2.00", "3", "2021-01-03"],
            ["durian", "3530111333300000", "5.00", "1", "2021-01-04"],
            ["elderberry", "5555555555554444", "3.00", "2", "2021-01-05"],
        ],
        "link": "https://example.com",
        "table_index": 1,
        "table_name": "product_purchases",
        "table_description": "This table contains data of product purchases",
    }
)

response = requests.request(
    "POST", f"{base_url}/import_table/create", headers=headers, data=payload
)

print(response.text)
