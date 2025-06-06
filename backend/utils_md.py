########################################
### Metadata Related Functions Below ###
########################################

import json
import sqlglot
from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession
from db_models import (
    Metadata as DbMetadata,
)  # to disambiguate from sqlalchemy's Metadata
from db_config import engine
from request_models import TableDescription
import os

home_dir = os.path.expanduser("~")
defog_path = os.path.join(home_dir, ".defog")


async def get_metadata(db_name: str) -> list[dict[str, str]]:
    """
    Get metadata for a given db name.
    Returns a list of dictionaries, each containing:
        - table_name: str
        - column_name: str
        - data_type: str
        - column_description: str
    """
    async with engine.begin() as conn:
        metadata_result = await conn.execute(
            select(
                DbMetadata.table_name,
                DbMetadata.column_name,
                DbMetadata.data_type,
                DbMetadata.column_description,
            )
            .where(DbMetadata.db_name == db_name)
            .order_by(DbMetadata.table_name, DbMetadata.column_name)
        )
        # Convert to list of dictionaries with proper keys
        metadata = [
            {
                "table_name": row[0],
                "column_name": row[1],
                "data_type": row[2],
                "column_description": row[3] or "",  # Convert None to empty string
            }
            for row in metadata_result.fetchall()
        ]
    return metadata


async def set_metadata(db_name: str, table_metadata: list[dict[str, str]]):
    """
    Update or insert metadata for a given API key.
    Args:
        db_name: The API key to update metadata for
        table_metadata: List of dictionaries containing column metadata with keys:
            - table_name: str
            - column_name: str
            - data_type: str
            - column_description: str (optional)
    """
    if not table_metadata:
        return

    table_names = list({item["table_name"] for item in table_metadata})

    # Validate required fields exist in each item
    required_fields = {"table_name", "column_name", "data_type"}
    for item in table_metadata:
        missing_fields = required_fields - set(item.keys())
        if missing_fields:
            raise ValueError(f"Missing required fields: {missing_fields}")

    async with AsyncSession(engine) as session:
        async with session.begin():
            # Delete existing metadata for this db_name
            await session.execute(
                delete(DbMetadata).where(DbMetadata.db_name == db_name)
            )
            # Insert the new metadata
            await session.execute(
                insert(DbMetadata),
                [
                    {
                        "db_name": db_name,
                        "table_name": item["table_name"],
                        "column_name": item["column_name"],
                        "data_type": item["data_type"],
                        "column_description": item.get(
                            "column_description", ""
                        ),  # Default to empty string if not provided
                    }
                    for item in table_metadata
                ],
            )

            # update the selected tables in the json
            # set the selected tables according to the metadata
            # see comment in `get_tables_db_creds` for the full context
            selected_tables_path = os.path.join(
                defog_path, f"selected_tables_{db_name}.json"
            )

            with open(selected_tables_path, "w") as f:
                json.dump(table_names, f)

    return


def mk_create_table_ddl(
    table_name: str, columns: list[dict[str, str]], table_description: str | None = None
) -> str:
    """
    Return a DDL statement for creating a table from a list of columns
    `columns` is a list of dictionaries with the following keys:
    - column_name: str
    - data_type: str
    """
    md_create = ""
    if table_description:
        md_create += f"COMMENT ON TABLE {table_name} IS '{table_description}';\n"
    md_create += f"CREATE TABLE IF NOT EXISTS {table_name} (\n"
    for i, column in enumerate(columns):
        col_name = column["column_name"]
        # if column name has spaces and hasn't been wrapped in double quotes, wrap it in double quotes
        if " " in col_name and not col_name.startswith('"'):
            col_name = f'"{col_name}"'
        dtype = column["data_type"]
        col_desc = column.get("column_description", "")
        if i < len(columns) - 1:
            md_create += (
                f"  {col_name} {dtype}, /* {col_desc} */\n"
                if col_desc
                else f"  {col_name} {dtype},\n"
            )
        else:
            # avoid the trailing comma for the last line
            md_create += (
                f"  {col_name} {dtype} /* {col_desc} */\n"
                if col_desc
                else f"  {col_name} {dtype}\n"
            )
    md_create += ");\n"
    return md_create


def mk_create_ddl(
    md: list[dict[str, str]], table_descriptions: list[TableDescription] = []
) -> str:
    """
    Return a DDL statement for creating tables from a metadata list
    [
        {'table_name': 'table1', 'column_name': 'col1', 'data_type': 'int'},
        {'table_name': 'table1', 'column_name': 'col2', 'data_type': 'text'},
        {'table_name': 'table2', 'column_name': 'col1', 'data_type': 'text', 'column_description': 'description'},
    ]
    """
    md_create = ""
    available_schemas = set("")
    md_dict = {}
    table_descriptions_dict = {
        td.table_name: td.table_description for td in table_descriptions
    }
    for column in md:
        full_table_name = column["table_name"]
        if "." in full_table_name:
            table_name_split = full_table_name.rsplit(".", 1)
            if len(table_name_split) == 2:
                schema_name = table_name_split[0]
                table_name = f"{schema_name}.{table_name_split[1]}"
            else:
                schema_name = ""
                table_name = table_name_split[0]
            if schema_name not in available_schemas:
                md_create += f"CREATE SCHEMA IF NOT EXISTS {schema_name};\n"
                available_schemas.add(schema_name)
        else:
            table_name = full_table_name
        if table_name not in md_dict:
            md_dict[table_name] = []
        md_dict[table_name].append(column)
    for table_name, columns in md_dict.items():
        md_create += mk_create_table_ddl(
            table_name, columns, table_descriptions_dict.get(table_name)
        )
    return md_create


def check_metadata_validity(
    table_metadata: list[dict[str, str]], db_type: str
) -> str | None:
    """
    Check if the metadata is valid for the given database type, and returns the associated error if it not. If sqlglot can parse the DDL, we return None. Else, we return the error message.
    """
    # first, make sure that all *combinations* of table names and column names are unique
    table_column_names = set()
    for item in table_metadata:
        if (item["table_name"], item["column_name"]) in table_column_names:
            return f"Duplicate values exist for column name {item['column_name']} in table {item['table_name']}. In addition, there might be other similar duplication issues. Please correct the metadata and re-upload."
        else:
            table_column_names.add((item["table_name"], item["column_name"]))
    # next, check if the DDL is valid for the given database type
    ddl = mk_create_ddl(table_metadata)
    if db_type == "sqlserver":
        syntax = "tsql"
    else:
        syntax = db_type
    try:
        sqlglot.parse(ddl, read=syntax)
        return None
    except Exception as e:
        return str(e)
