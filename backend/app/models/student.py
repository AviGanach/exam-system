import logging

from typing import Optional, Dict, Any
from app.db import db_cursor

logger = logging.getLogger(__name__)

def get_or_create_student(name: str, id_number: str, email: str) -> Optional[int]:
    """מחזיר student_id אם קיים, או יוצר חדש ומחזיר את ה-ID"""
    try:
        with db_cursor() as (conn, cursor):
            # בדיקה אם התלמיד קיים לפי ת.ז
            cursor.execute("SELECT id FROM students WHERE id_number = %s", (id_number,))
            result = cursor.fetchone()

            if result:
                # עדכון פרטים (למקרה שהתלמיד שינה מייל או שם)
                cursor.execute("""
                    UPDATE students 
                    SET name = %s, email = %s 
                    WHERE id_number = %s
                """, (name, email, id_number))
                conn.commit()
                return result['id']

            # יצירת תלמיד חדש
            cursor.execute("""
                INSERT INTO students (name, id_number, email) 
                VALUES (%s, %s, %s)
            """, (name, id_number, email))
            conn.commit()
            return cursor.lastrowid

    except Exception as e:
        logger.error(f"Database error in get_or_create_student: {e}")
        return None