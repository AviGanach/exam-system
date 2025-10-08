import logging

from typing import Optional, Dict, Any
from app.db import db_cursor
from datetime import datetime

logger = logging.getLogger(__name__)


def get_exam_inpo_by_code(exam_code: str) -> Optional[Dict[str, Any]]:
    """מחזיר פרטי מבחן לפי קוד"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT id, title, description, start_time, end_time, 
                       duration_minutes, passing_grade, show_timer, 
                       show_grade_immediately, track_window_switches, 
                       max_score, status
                FROM exams 
                WHERE exam_code = %s AND status = 'active'
            """, (exam_code,))
            return cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error in get_exam_by_code: {e}")
        return None


def is_exam_available(exam_id: int) -> bool:
    """בודק אם המבחן זמין כרגע (בין זמני פתיחה וסגירה)"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT start_time, end_time 
                FROM exams 
                WHERE id = %s AND status = 'active'
            """, (exam_id,))
            result = cursor.fetchone()

            if not result:
                return False

            current_time = datetime.now()

            # אם אין זמני הגבלה - המבחן תמיד זמין
            if not result['start_time'] and not result['end_time']:
                return True

            # בדיקת זמן התחלה
            if result['start_time'] and current_time < result['start_time']:
                return False

            # בדיקת זמן סיום
            if result['end_time'] and current_time > result['end_time']:
                return False

            return True

    except Exception as e:
        logger.error(f"Database error in is_exam_available: {e}")
        return False


def get_exam(exam_id: int) -> Optional[Dict[str, Any]]:
    """מחזיר מבחן עם כל השאלות והאפשרויות"""
    try:
        with db_cursor() as (conn, cursor):
            # שליפת פרטי המבחן
            cursor.execute("""
                SELECT title, description, duration_minutes, show_timer, 
                       track_window_switches, max_score
                FROM exams 
                WHERE id = %s AND status = 'active'
            """, (exam_id,))
            exam = cursor.fetchone()

            if not exam:
                return None

            # שליפת השאלות
            cursor.execute("""
                SELECT id, question_text, question_type, points, question_order
                FROM questions 
                WHERE exam_id = %s 
                ORDER BY question_order
            """, (exam_id,))
            questions = cursor.fetchall()

            # שליפת אפשרויות לשאלות אמריקאיות
            for question in questions:
                if question['question_type'] == 'multiple_choice':
                    cursor.execute("""
                        SELECT option_letter, option_text
                        FROM question_options 
                        WHERE question_id = %s 
                        ORDER BY option_letter
                    """, (question['id'],))
                    question['options'] = cursor.fetchall()
                else:
                    question['options'] = []

            exam['questions'] = questions
            return exam

    except Exception as e:
        logger.error(f"Database error in get_exam_with_questions: {e}")
        return None