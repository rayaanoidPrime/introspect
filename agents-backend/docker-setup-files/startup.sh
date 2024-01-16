python3 create_admin_user.py

service supervisor stop
service supervisor start

supervisorctl start all

tail -f /agent-logs