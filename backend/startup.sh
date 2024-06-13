python3 create_sqlite_tables.py
python3 create_admin_user.py
python3 add_tools_to_db.py
python3 -m hypercorn main:app -b 0.0.0.0:1235 --reload