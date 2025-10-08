import os
import pymysql
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

@contextmanager
def db_cursor():
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_DATABASE'),
        cursorclass=pymysql.cursors.DictCursor
    )
    cursor = conn.cursor()
    try:
        yield conn, cursor
    finally:
        cursor.close()
        conn.close()