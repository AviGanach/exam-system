import logging
from datetime import datetime

from typing import Optional, Dict, Any
from app.db import db_cursor

logger = logging.getLogger(__name__)


def start_exam_submission(student_id: int, exam_id: int, max_score: float) -> Optional[int]:
    """יוצר submission חדש ומחזיר את ה-ID"""
    try:
        logger.info(f"Creating exam_submission for student {student_id}, exam {exam_id}, max_score={max_score}")
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

def get_submission_info(submission_id: int) -> Dict[str, Any]|None:
    "מחזיר את פרטי המבחן"
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT status
                from exam_submissions
                WHERE id = %s""", submission_id)

            result = cursor.fetchone()
            return result['status']
    except Exception as e:
        logger.error(f"Database error in get_submission_status: {e}")
        return None

def finalize_submission(submission_id: int, total_score, window_switches, total_away_time):
    """מסמן את זמן סיום ההגשה עם נתוני אנטי-רמאות וציון"""
    try:
        logger.info(f"Finalizing exam_submission {submission_id} with score {total_score}, switches: {window_switches}, away_time: {total_away_time}")
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                UPDATE exam_submissions
                SET end_time = %s, total_score = %s, window_switches = %s, total_away_time = %s, status = %s 
                WHERE id = %s
            """, (datetime.now(), total_score, window_switches, total_away_time, "completed", submission_id))
            conn.commit()
            return cursor.rowcount > 0
    except Exception as e:
        logger.error(f"Database error in finalize_submission: {e}")
        return None


def check_exam_has_submissions(exam_id: int, teacher_id: int) -> Dict[str, int]|None:
    """בודק כמה הגשות יש למבחן לפי סטטוס"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN es.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
                    SUM(CASE WHEN es.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN es.status = 'abandoned' THEN 1 ELSE 0 END) as abandoned_count
                FROM exam_submissions es
                JOIN exams e ON es.exam_id = e.id
                WHERE e.id = %s AND e.teacher_id = %s
            """, (exam_id, teacher_id))

            result = cursor.fetchone()
            return {
                'completed': int(result['completed_count'] or 0),
                'in_progress': int(result['in_progress_count'] or 0),
                'abandoned': int(result['abandoned_count'] or 0)
            }

    except Exception as e:
        logger.error(f"Database error in check_exam_has_submissions: {e}")
        return None

def delete_exam_submissions_and_student_answers(exam_id: int) -> Dict[str, int]:
    """מחיקה מדורגת של תשובות סטודנטים והגשות מבחן - מחזיר פרטי המחיקה"""
    try:
        with db_cursor() as (conn, cursor):
            # התחלת טרנזקציה מפורשת
            conn.autocommit = False
            try:
                # מחיקה מדורגת
                # 1. מחיקת תשובות הסטודנטים תחילה
                cursor.execute("""
                                DELETE FROM student_answers 
                                WHERE submission_id IN (
                                    SELECT id FROM exam_submissions WHERE exam_id = %s
                                )
                            """, (exam_id,))
                deleted_answers = cursor.rowcount
                logger.info(f"Deleted {deleted_answers} student answers for exam {exam_id}")

                # 2. מחיקת ההגשות עצמן
                cursor.execute("""
                                DELETE FROM exam_submissions 
                                WHERE exam_id = %s
                            """, (exam_id,))
                deleted_submissions = cursor.rowcount
                logger.info(f"Deleted {deleted_submissions} submissions for exam {exam_id}")

                # אישור הטרנזקציה
                conn.commit()
                logger.info(f"✅ Successfully deleted all submission data for exam {exam_id}")

                return {
                    'success': True,
                    'deleted_count': deleted_submissions,
                    'deleted_answers': deleted_answers
                }

            except Exception as inner_error:
                # ביטול הטרנזקציה במקרה של שגיאה
                conn.rollback()
                logger.error(f"❌ Transaction rolled back due to error: {inner_error}")
                return {
                    'success': False,
                    'error': f'Database error during deletion: {str(inner_error)}'
                }

            finally:
                conn.autocommit = True

    except Exception as e:
        logger.error(f"Connection error in delete_exam_submissions_cascade: {e}")
        return {
            'success': False,
            'error': 'Database connection error'
        }


def get_submission_status_by_student(student_id: int, exam_id: int) -> Dict[str, Any]:
    """
    בדיקת סטטוס הגשה של תלמיד ספציפי במבחן ספציפי
    מחזיר:
    {
        'success': True/False,
        'status': None/'in_progress'/'completed'/'abandoned',
        'found': True/False,  # האם נמצאה רשומה
        'error': str (רק אם success=False)
    }
    """
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT status
                FROM exam_submissions
                WHERE student_id = %s AND exam_id = %s
                ORDER BY start_time DESC
                LIMIT 1
            """, (student_id, exam_id))

            result = cursor.fetchone()

            if result:
                return {
                    'success': True,
                    'status': result['status'],
                    'found': True
                }
            else:
                return {
                    'success': True,  # לא מצא רשומה - זה בסדר
                    'status': None,
                    'found': False
                }

    except Exception as e:
        logger.error(f"Database error in get_submission_status_by_student: {e}")
        return {
            'success': False,
            'status': None,
            'found': False,
            'error': str(e)
        }

def get_submissions_with_answers(exam_id: int, teacher_id: int) -> Optional[Dict[str, Any]]:
    """קבלת כל ההגשות והתשובות למבחן עם כל הפרטים הנדרשים"""
    try:
        with db_cursor() as (conn, cursor):
            # בדיקה שהמבחן שייך למורה
            cursor.execute("""
                SELECT title, passing_grade FROM exams 
                WHERE id = %s AND teacher_id = %s
            """, (exam_id, teacher_id))

            exam_result = cursor.fetchone()
            if not exam_result:
                logger.warning(f"Exam {exam_id} not found or doesn't belong to teacher {teacher_id}")
                return None

            # השאילתא הגדולה - חיבור כל הטבלאות
            cursor.execute("""
                SELECT 
                    -- פרטי ההגשה
                    es.id as submission_id,+
                    es.start_time,+
                    es.end_time,+
                    es.total_score,+
                    es.max_score,+
                    es.window_switches,
                    es.status,
                    es.created_at,

                    -- פרטי התלמיד
                    s.id_number as student_id,+
                    s.name as student_name,+
                    s.email as student_email,

                    -- פרטי השאלה
                    q.id as question_id,
                    q.question_order,
                    q.question_text,
                    q.question_type,
                    q.points as max_question_score,
                    q.correct_answer as expected_answer,
                    q.programming_language,

                    -- תשובת התלמיד
                    sa.selected_option,
                    sa.answer_text,
                    sa.score as question_score,

                    -- אפשרויות השאלה האמריקאית (רק לתצוגה)
                    GROUP_CONCAT(
                        CASE WHEN qo.option_letter IS NOT NULL 
                        THEN CONCAT(qo.option_letter, '. ', qo.option_text, 
                             CASE WHEN qo.is_correct THEN ' [נכון]' ELSE '' END)
                        END 
                        SEPARATOR ' | '
                    ) as question_options

                FROM exam_submissions es

                -- חיבור לתלמיד
                LEFT JOIN students s ON es.student_id = s.id

                -- חיבור לתשובות
                LEFT JOIN student_answers sa ON es.id = sa.submission_id

                -- חיבור לשאלות
                LEFT JOIN questions q ON sa.question_id = q.id

                -- חיבור לאפשרויות (רק לשאלות אמריקאיות)
                LEFT JOIN question_options qo ON q.id = qo.question_id

                WHERE es.exam_id = %s

                GROUP BY 
                    es.id, s.id, q.id, sa.id

                ORDER BY 
                    es.start_time, s.name, q.question_order
            """, (exam_id,))

            results = cursor.fetchall()

            if not results:
                return {
                    'exam_title': exam_result['title'],
                    'passing_grade': exam_result['passing_grade'],
                    'submissions': []
                }

            # ארגון הנתונים לפי הגשות
            submissions_dict = {}

            for row in results:
                submission_id = row['submission_id']

                # אם זו הגשה חדשה
                if submission_id not in submissions_dict:
                    submissions_dict[submission_id] = {
                        'question_id': row['question_id'],
                        'student_id': row['student_id'],
                        'student_name': row['student_name'] or 'תלמיד לא ידוע',
                        'student_email': row['student_email'] or '',
                        'start_time': row['start_time'],
                        'end_time': row['end_time'],
                        'status': row['status'],
                        'window_switches': row['window_switches'],
                        'total_score': row['total_score'] or 0,
                        'max_score': row['max_score'] or 0,
                        'passing_grade': exam_result['passing_grade'],
                        'answers': []
                    }

                # הוספת התשובה
                if row['question_id']:  # וודא שיש שאלה

                    # הכן תצוגה של התשובה
                    answer_data = {
                        'question_order': row['question_order'],
                        'question_text': row['question_text'],
                        'question_type': row['question_type'],
                        'max_question_score': row['max_question_score'],
                        'expected_answer': row['expected_answer'],
                        'programming_language': row['programming_language'],
                        'selected_option': row['selected_option'],
                        'answer_text': row['answer_text'],
                        'question_options': row['question_options'],  # לתצוגה
                        'question_score': row['question_score'] or 0
                    }
                    if row['question_type'] == 'multiple_choice':
                        answer_data['student_answer_display'] = row['selected_option'] or 'לא נענה'
                    elif row['question_type'] in ['open_text', 'code']:
                        answer_data['student_answer_display'] = row['answer_text'] or 'לא נענה'
                    else:
                        answer_data['student_answer_display'] = 'לא נענה'

                    submissions_dict[submission_id]['answers'].append(answer_data)

            # המר למערך
            submissions_list = list(submissions_dict.values())

            logger.info(f"Retrieved {len(submissions_list)} submissions with answers for exam {exam_id}")

            return {
                'exam_title': exam_result['title'],
                'passing_grade': exam_result['passing_grade'],
                'submissions': submissions_list
            }

    except Exception as e:
        logger.error(f"Database error in get_submissions_with_answers: {e}")
        return None