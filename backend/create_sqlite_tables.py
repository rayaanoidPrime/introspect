# read a sql file, and create tables in sqlite database

import sqlite3
import os


def create_tables(db_path, create_sql_path):
    # connect to the database, if not exist, create a new one
    if not os.path.exists(db_path):
        open(db_path, "w").close()

    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # read sql file
    with open(create_sql_path, "r") as f:
        sql = f.read()

    # create tables
    c.executescript(sql)

    # commit changes
    conn.commit()

    # close connection
    conn.close()


create_tables("./defog.db", "./docker-setup-files/schema_sqlite.sql")
