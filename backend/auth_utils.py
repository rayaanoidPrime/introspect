import hashlib
from db_utils import engine, Users
from sqlalchemy import (
    select,
    update,
)


SALT = "TOMMARVOLORIDDLE"


def validate_user(token, user_type=None, get_username=False):
    with engine.connect() as conn:
        user = conn.execute(
            select(Users).where(Users.hashed_password == token)
        ).fetchone()

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
    with engine.connect() as conn:
        user = conn.execute(
            select(Users).where(Users.hashed_password == hashed_password)
        ).fetchone()

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
    with engine.connect() as conn:
        conn.execute(
            update(Users)
            .where(Users.username == username)
            .values(hashed_password=hashed_password)
        )


def get_hashed_password(username, password):
    return hashlib.sha256((username + SALT + password).encode()).hexdigest()


def validate_user_email(email):
    with engine.connect() as conn:
        user = conn.execute(select(Users).where(Users.username == email)).fetchone()
    if user:
        return True
    else:
        return False
