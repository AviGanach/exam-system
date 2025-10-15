import logging

from datetime import datetime, timedelta

from app.db import db_cursor

logger = logging.getLogger(__name__)


def is_admin_email(email: str) -> bool:
    """בודק אם המייל שייך לאדמין"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("SELECT email FROM admin WHERE email = %s", (email,))
            result = cursor.fetchone()
            return result is not None
    except Exception as e:
        logger.error(f"Database error in is_admin_email: {e}")
        return False


def save_admin_verification_code(email: str, code: str) -> bool:
    """שומר קוד אימות לאדמין"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute(
                "UPDATE admin SET verification_code = %s, code_created_at = %s WHERE email = %s",
                (code, datetime.now(), email)
            )
            conn.commit()
            return cursor.rowcount > 0
    except Exception as e:
        logger.error(f"Database error in save_admin_verification_code: {e}")
        return False


def verify_admin_code_from_db(email: str, code: str) -> bool:
    """מאמת קוד אימות של אדמין ובודק תוקף (10 דקות)"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT verification_code, code_created_at 
                FROM admin 
                WHERE email = %s
            """, (email,))
            result = cursor.fetchone()

            if not result:
                return False

            # בדיקת הקוד
            if result['verification_code'] != code:
                return False

            # בדיקת תוקף
            if not result['code_created_at']:
                return False

            if datetime.now() - result['code_created_at'] > timedelta(minutes=10):
                return False  # קוד פג תוקף

            return True

    except Exception as e:
        logger.error(f"Database error in verify_admin_code_from_db: {e}")
        return False


def update_teacher_password_in_db(new_password: str) -> bool:
    """מעדכן את סיסמת המורים בDB"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute(
                "UPDATE admin SET teacher_password = %s",
                (new_password,)
            )
            conn.commit()
            success = cursor.rowcount > 0

            if success:
                logger.info("Teacher password updated successfully in database")
            else:
                logger.warning("No rows affected when updating teacher password")

            return success

    except Exception as e:
        logger.error(f"Database error in update_teacher_password_in_db: {e}")
        return False


def update_admin_email_in_db(old_email: str, new_email: str) -> bool:
    """מעדכן את כתובת המייל של האדמין בDB"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute(
                "UPDATE admin SET email = %s WHERE email = %s",
                (new_email, old_email)
            )
            conn.commit()
            success = cursor.rowcount > 0

            if success:
                logger.info(f"Admin email updated from {old_email} to {new_email}")
            else:
                logger.warning(f"No admin found with email {old_email}")

            return success

    except Exception as e:
        logger.error(f"Database error in update_admin_email_in_db: {e}")
        return False