import logging

from datetime import datetime, timedelta
from typing import Optional

from app.db import db_cursor


logger = logging.getLogger(__name__)

def get_teacher_password():
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("SELECT teacher_password FROM admin LIMIT 1")
            result = cursor.fetchone()
            return result['teacher_password'] if result else None
    except Exception as e:
        logger.error(f"Database error in login: {e}")
        return None


def verify_and_clear_admin_code(email: str, code: str) -> bool:
    """מאמת קוד אימות של אדמין, בודק תוקף ומוחק את הקוד"""
    try:
        with db_cursor() as (conn, cursor):
            # שלב 1: שליפה ובדיקה
            cursor.execute(
                "SELECT verification_code, code_created_at FROM admin WHERE email = %s",
                (email,)
            )
            result = cursor.fetchone()

            if not result:
                return False

            # בדיקת הקוד
            if result['verification_code'] != code:
                return False

            # בדיקת תוקף
            if not result['code_created_at']:
                return False

            code_time = result['code_created_at']
            current_time = datetime.now()
            time_diff = current_time - code_time

            if time_diff > timedelta(minutes=10):
                return False

            # שלב 2: מחיקת הקוד (שימוש חד פעמי)
            cursor.execute(
                "UPDATE admin SET verification_code = NULL, code_created_at = NULL WHERE email = %s",
                (email,)
            )
            conn.commit()

            return True

    except Exception as e:
        logger.error(f"Database error in verify_and_clear_admin_code: {e}")
        return False


def ensure_teacher_exists(email: str) -> Optional[int]:
    """מוודא שהמורה קיים בטבלה, אם לא - יוצר אותו. מחזיר teacher_id"""
    try:
        with db_cursor() as (conn, cursor):
            # נסה להכניס, אם קיים - תתעלם מהשגיאה
            cursor.execute(
                "INSERT IGNORE INTO teachers (email) VALUES (%s)",
                (email,)
            )

            # שלוף את ה-ID (בין אם הכנסת עכשיו או שכבר קיים)
            cursor.execute("SELECT id FROM teachers WHERE email = %s", (email,))
            result = cursor.fetchone()

            conn.commit()
            return result['id'] if result else None

    except Exception as e:
        logger.error(f"Database error in ensure_teacher_exists: {e}")
        return None