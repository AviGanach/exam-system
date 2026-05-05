import logging
from datetime import datetime

from typing import Optional, Dict, Any
from app.db import db_cursor

logger = logging.getLogger(__name__)


def insert_student_answer(
    submission_id: int,
    question_id: int,
    answer_text: Optional[str],
    selected_option: Optional[str],
    score: Optional[float],
    max_question_score: float,
    ai_explanation: str
) -> bool:
    """
    מכניס או מעדכן תשובה של תלמיד לשאלה במבחן.
    אם קיימת כבר תשובה לשאלה — מעדכן אותה במקום ליצור כפילות.
    """
    try:
        print("selected_option ------",selected_option)
        with db_cursor() as (conn, cursor):

            # בדיקה אם התשובה כבר קיימת
            cursor.execute("""
                SELECT id 
                FROM student_answers
                WHERE submission_id = %s AND question_id = %s
            """, (submission_id, question_id))

            exists = cursor.fetchone()

            if exists:
                # עדכון תשובה קיימת
                cursor.execute("""
                        UPDATE student_answers
                        SET selected_option = %s,
                            answer_text = %s,
                            score = %s,
                            answered_at = %s,
                            ai_explanation = %s
                        WHERE submission_id = %s AND question_id = %s
                    """, (
                    selected_option,
                    answer_text,
                    score,
                    datetime.now(),
                    ai_explanation,
                    submission_id,
                    question_id
                ))
            else:
                # יצירת תשובה חדשה
                cursor.execute("""
                    INSERT INTO student_answers
                    (submission_id, question_id, answer_text, selected_option, score, max_question_score, answered_at, ai_explanation)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    submission_id,
                    question_id,
                    answer_text,
                    selected_option,
                    score,
                    max_question_score,
                    datetime.now(),
                    ai_explanation
                ))

            conn.commit()
            return True

    except Exception as e:
        logger.error(f"Database error in insert_student_answer: {e}")
        return False


def get_student_answers_data(submission_id: int) -> list[Dict[str, Any]]:
    """
    קבלת המידע על תשובות התלמיד לצורך הסקירה
    :param submission_id:
    :return:
    """
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
            SELECT
                sa.question_id, 
                sa.answer_text,
                sa.selected_option,
                sa.score,
                sa.max_question_score,
                sa.ai_explanation,
                q.correct_answer
            FROM student_answers AS sa
            JOIN questions q ON sa.question_id = q.id
            WHERE sa.submission_id = %s   
            """, (submission_id,))

            results = cursor.fetchall()
            return results

    except Exception as e:
        logger.error(f"Database error get data student answers: {e}")
        return []