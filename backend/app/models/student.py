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


def get_student_exam_status(student_id: int, exam_id: int) -> Dict[str, Any]:
    """מחזיר את סטטוס המבחן של התלמיד"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT id, start_time, end_time, status FROM exam_submissions 
                WHERE student_id = %s AND exam_id = %s
            """, (student_id, exam_id))
            result = cursor.fetchone()

            if not result:
                return {'exists': False}

            return {
                'exists': True,
                'submission_id': result['id'],
                'end_time': result['end_time'] is not None,
            }

    except Exception as e:
        logger.error(f"Database error in get_student_exam_status: {e}")
        return {'exists': False}


def start_exam_submission(student_id: int, exam_id: int, max_score: float) -> Optional[int]:
    """יוצר submission חדש ומחזיר את ה-ID"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                INSERT INTO exam_submissions (student_id, exam_id, start_time, max_score, status) 
                VALUES (%s, %s, NOW(), %s, 'in_progress')
            """, (student_id, exam_id, max_score))
            conn.commit()
            return cursor.lastrowid

    except Exception as e:
        logger.error(f"Database error in start_exam_submission: {e}")
        return None