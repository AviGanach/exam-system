import logging

from typing import Optional, Dict, Any, List
from app.db import db_cursor
from datetime import datetime

logger = logging.getLogger(__name__)

def create_exam_in_db(exam_details: Dict[str, Any]) -> Optional[int]:
    """יוצר מבחן חדש במסד הנתונים"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                INSERT INTO exams (
                    teacher_id, exam_code, title, description, 
                    duration_minutes, passing_grade, start_time, end_time,
                    show_timer, show_grade_immediately, show_review_after_exam, track_window_switches,
                    max_score, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                exam_details['teacher_id'],
                exam_details['exam_code'],
                exam_details['title'],
                exam_details['description'],
                exam_details['duration_minutes'],
                exam_details['passing_grade'],
                exam_details['start_time'],
                exam_details['end_time'],
                exam_details['show_timer'],
                exam_details['show_grade_immediately'],
                exam_details['show_review_after_exam'],
                exam_details['track_window_switches'],
                exam_details['max_score'],
                exam_details['status']
            ))
            conn.commit()
            return cursor.lastrowid

    except Exception as e:
        logger.error(f"Database error in create_exam_in_db: {e}")
        return None

def update_exam_details_db(exam_id: int, teacher_id: int, exam_details: Dict[str, Any]) -> bool:
    """מעדכן פרטי מבחן במסד הנתונים"""
    try:
        with db_cursor() as (conn, cursor):
            # בדיקה שהמבחן שייך למורה
            cursor.execute("""
                SELECT id FROM exams 
                WHERE id = %s AND teacher_id = %s
            """, (exam_id, teacher_id))

            if not cursor.fetchone():
                logger.warning(f"Exam {exam_id} not found or doesn't belong to teacher {teacher_id}")
                return False

            # עדכון פרטי המבחן
            cursor.execute("""
                UPDATE exams SET 
                    title = %s,
                    description = %s,
                    duration_minutes = %s,
                    passing_grade = %s,
                    start_time = %s,
                    end_time = %s,
                    show_timer = %s,
                    show_grade_immediately = %s,
                    show_review_after_exam = %s,
                    track_window_switches = %s,
                    status = %s
                WHERE id = %s AND teacher_id = %s
            """, (
                exam_details['title'],
                exam_details['description'],
                exam_details['duration_minutes'],
                exam_details['passing_grade'],
                exam_details['start_time'],
                exam_details['end_time'],
                exam_details['show_timer'],
                exam_details['show_grade_immediately'],
                exam_details['show_review_after_exam'],
                exam_details['track_window_switches'],
                exam_details['status'],
                exam_id,
                teacher_id
            ))

            conn.commit()
            affected_rows = cursor.rowcount

            if affected_rows == 0:
                logger.info(f"No changes needed for exam {exam_id} details")
                return False
            else:
                logger.info(f"Updated exam {exam_id} details")
                return True

    except Exception as e:
        logger.error(f"Database error in update_exam_details_db: {e}")
        return False

def update_exam_max_score(exam_id: int, teacher_id: int, new_max_score: int) -> bool:
    """עדכון ניקוד מקסימלי של מבחן"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                UPDATE exams 
                SET max_score = %s 
                WHERE id = %s AND teacher_id = %s
            """, (new_max_score, exam_id, teacher_id))

            conn.commit()
            affected_rows = cursor.rowcount

            if affected_rows > 0:
                logger.info(f"Updated max_score to {new_max_score} for exam {exam_id}")
                return True
            else:
                logger.warning(f"No exam found to update max_score: exam_id={exam_id}, teacher_id={teacher_id}")
                return False

    except Exception as e:
        logger.error(f"Error updating exam max_score: {e}")
        return False

def get_exam_info_by_code(exam_code: str) -> Optional[Dict[str, Any]]:
    """מחזיר פרטי מבחן לפי קוד"""
    try:
        print("CH")
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT id, title, description, start_time, end_time, 
                       duration_minutes, passing_grade, show_timer, 
                       show_grade_immediately, show_review_after_exam, track_window_switches, 
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
                SELECT id, question_text, question_type, points, question_order,initial_code
                FROM questions 
                WHERE exam_id = %s 
                ORDER BY question_order
            """, (exam_id,))
            questions = cursor.fetchall()

            # שליפת אפשרויות לשאלות אמריקאיות
            # TODO קרא לפונ' מ question_option.py
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

def delete_exam_cascade(exam_id: int, teacher_id: int) -> bool:
    """
    מחיקה מדורגת מלאה של מבחן ואת כל הנתונים הקשורים

    מבצע מחיקה בסדר הנכון:
    1. תשובות סטודנטים (student_answers)
    2. אפשרויות שאלות (question_options)
    3. שאלות (questions)
    4. הגשות מבחן (exam_submissions)
    5. המבחן עצמו (exams)

    הכל בטרנזקציה אחת - או הכל מצליח או הכל נכשל. *** אין לחלק להרבה פונקציות קטנות ולהתאים כל שאילתה למודל שלה ***
    """
    try:
        with db_cursor() as (conn, cursor):
            # בדיקת בעלות ורשאות
            cursor.execute("""
                SELECT id FROM exams 
                WHERE id = %s AND teacher_id = %s
            """, (exam_id, teacher_id))

            if not cursor.fetchone():
                logger.warning(f"Exam {exam_id} not found or doesn't belong to teacher {teacher_id}")
                return False

            logger.info(f"Starting cascade deletion for exam {exam_id}")

            # מחיקה מדורגת בסדר הנכון
            deletion_steps = [
                (
                "DELETE FROM student_answers WHERE submission_id IN (SELECT id FROM exam_submissions WHERE exam_id = %s)",
                "student answers"),
                ("DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE exam_id = %s)",
                 "question options"),
                ("DELETE FROM questions WHERE exam_id = %s", "questions"),
                ("DELETE FROM exam_submissions WHERE exam_id = %s", "submissions"),
                ("DELETE FROM exams WHERE id = %s AND teacher_id = %s", "exam")
            ]

            for sql, description in deletion_steps:
                params = (exam_id, teacher_id) if 'teacher_id' in sql else (exam_id,)
                cursor.execute(sql, params)
                affected_rows = cursor.rowcount
                logger.info(f"🗑️ Deleted {affected_rows} {description} for exam {exam_id}")

            # אישור הטרנזקציה
            conn.commit()
            logger.info(f"🎉 Successfully deleted exam {exam_id} with all related data")
            return True

    except Exception as e:
        logger.error(f"Database error in delete_exam_cascade: {e}")
        return False

def get_exam_for_teacher(exam_id: int, teacher_id: int):
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT id FROM exams
                WHERE id = %s AND teacher_id = %s
            """, (exam_id, teacher_id))

            return cursor.fetchone()
    except Exception as e:
        logger.error(f"Database error in get_exam_for_teacher: {e}")
        return None


def get_exam_completion_settings(exam_id: int) -> Dict[str, Any] | None:
    """
        מחזיר הגדרות מבחן לסיום:
        - passing_grade: ציון עובר
        - show_grade_immediately: האם להציג ציון בסיום
        - show_review_after_exam: האם לאפשר סקירת מבחן מפורטת
        """
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT passing_grade, show_grade_immediately, show_review_after_exam
                FROM exams
                WHERE id = %s
            """, (exam_id,))

            result = cursor.fetchone()
            if result:
                return {
                    'passing_grade': result['passing_grade'],
                    'show_grade_immediately': result['show_grade_immediately'],
                    'show_review_after_exam': result['show_review_after_exam']
                }
            return None

    except Exception as e:
        logger.error(f"Database error in get_exam_has_show_grade_and_passing_grade: {e}")
        return None