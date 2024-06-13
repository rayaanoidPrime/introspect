import hashlib
import sqlite3


SALT = "TOMMARVOLORIDDLE"


def get_db_conn():
    # return sqlite3 connection
    return sqlite3.connect("./defog_local.db")


def validate_user(token, user_type=None, get_username=False):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT user_type, username FROM defog_users WHERE hashed_password = ?",
        (token,),
    )
    user = cur.fetchone()
    conn.close()
    if user:
        if user_type == "admin":
            if user[0] == "admin":
                if get_username:
                    return user[1]
                else:
                    return True
            else:
                return False
        else:
            if get_username:
                return user[1]
            else:
                return True
    else:
        return False


def login_user(username, password):
    hashed_password = hashlib.sha256((username + SALT + password).encode()).hexdigest()
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT user_type FROM defog_users WHERE hashed_password = ?",
        (hashed_password,),
    )
    user = cur.fetchone()
    conn.close()
    if user:
        return {"status": "success", "user_type": user[0], "token": hashed_password}
    else:
        return {
            "status": "unauthorized",
        }


def reset_password(username, new_password):
    hashed_password = hashlib.sha256(
        (username + SALT + new_password).encode()
    ).hexdigest()
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE defog_users SET hashed_password = ? WHERE username = ?",
        (hashed_password, username),
    )
    conn.commit()
    conn.close()
    return {"status": "success"}


def get_hashed_password(username, password):
    return hashlib.sha256((username + SALT + password).encode()).hexdigest()


def validate_user_email(email):
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_type FROM defog_users WHERE username = ?", (email,))
    user = cur.fetchone()
    conn.close()
    if user:
        return True
    else:
        return False
