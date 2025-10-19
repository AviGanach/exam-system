import logging
from typing import List, Dict, Any, Optional
from app.db import db_cursor

logger = logging.getLogger(__name__)

def get_teacher_id_by_email(email: str) -> Optional[int]:
    """מוצא teacher_id לפי email"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("SELECT id FROM teachers WHERE email = %s", (email,))
            result = cursor.fetchone()
            return result['id'] if result else None
    except Exception as e:
        logger.error(f"Error finding teacher by email: {e}")
        return None

def get_exams_by_teacher_id(teacher_id: int) -> Optional[List[Dict[str, Any]]]:
    """שולף את כל המבחנים של מורה ספציפי מהמסד"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT 
                    e.id,
                    e.exam_code,
                    e.title,
                    e.description,
                    e.start_time,
                    e.end_time,
                    e.duration_minutes,
                    e.status,
                    e.created_at,
                    COUNT(DISTINCT es.id) as total_submissions
                FROM exams e
                LEFT JOIN exam_submissions es ON e.id = es.exam_id
                WHERE e.teacher_id = %s
                GROUP BY e.id
                ORDER BY e.created_at DESC
            """, (teacher_id,))

            exams = cursor.fetchall()

            if exams:
                logger.info(f"Retrieved {len(exams)} exams for teacher {teacher_id}")
                return exams
            else:
                logger.info(f"No exams found for teacher {teacher_id}")
                return []

    except Exception as e:
        logger.error(f"Database error in get_exams_by_teacher_id: {e}")
        return None

def create_exam_in_db(exam_details: Dict[str, Any]) -> Optional[int]:
    """יוצר מבחן חדש במסד הנתונים"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                INSERT INTO exams (
                    teacher_id, exam_code, title, description, 
                    duration_minutes, passing_grade, start_time, end_time,
                    show_timer, show_grade_immediately, track_window_switches,
                    max_score, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                exam_details['track_window_switches'],
                exam_details['max_score'],
                exam_details['status']
            ))
            conn.commit()
            return cursor.lastrowid

    except Exception as e:
        logger.error(f"Database error in create_exam_in_db: {e}")
        return None


def create_questions_in_db(exam_id: int, questions: List[Dict[str, Any]]) -> bool:
    """יוצר שאלות למבחן במסד הנתונים"""
    try:
        with db_cursor() as (conn, cursor):
            for i, question in enumerate(questions):
                # יצירת השאלה
                cursor.execute("""
                                    INSERT INTO questions (
                                        exam_id, question_text, question_type, points, question_order,
                                        programming_language, initial_code, expected_output
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    exam_id,
                    question['question_text'],
                    question['question_type'],
                    question.get('points', 1),
                    i + 1,
                    question.get('programming_language'),  # NULL אם לא קיים
                    question.get('initial_code'),          # NULL אם לא קיים
                    question.get('expected_output')        # NULL אם לא קיים
                ))

                question_id = cursor.lastrowid

                # יצירת אפשרויות לשאלות אמריקאיות
                if question['question_type'] == 'multiple_choice' and question.get('options'):
                    for option in question['options']:
                        cursor.execute("""
                            INSERT INTO question_options (
                                question_id, option_text, option_letter, is_correct
                            ) VALUES (%s, %s, %s, %s)
                        """, (
                            question_id,
                            option['text'],
                            option['letter'],
                            option['is_correct']
                        ))

            conn.commit()
            return True

    except Exception as e:
        logger.error(f"Database error in create_questions_in_db: {e}")
        return False


def get_exam_with_questions_for_teacher(exam_id: int, teacher_id: int) -> Optional[Dict[str, Any]]:
    """שולף מבחן עם שאלות - רק אם המורה הוא הבעלים"""
    try:
        print(555)
        with db_cursor() as (conn, cursor):
            # שליפת המבחן עם בדיקת בעלות
            cursor.execute("""
                SELECT id, title, exam_code, description, duration_minutes, 
                       passing_grade, start_time, end_time, show_timer, 
                       show_grade_immediately, track_window_switches, 
                       max_score, status, created_at,
                       (SELECT COUNT(*) FROM exam_submissions WHERE exam_id = %s) as total_submissions
                FROM exams 
                WHERE id = %s AND teacher_id = %s
            """, (exam_id, exam_id, teacher_id))

            exam = cursor.fetchone()
            if not exam:
                return None

            # שליפת השאלות
            cursor.execute("""
                SELECT id, question_text, question_type, points, question_order,
                       programming_language, initial_code, expected_output
                FROM questions 
                WHERE exam_id = %s 
                ORDER BY question_order
            """, (exam_id,))

            questions = cursor.fetchall()

            # שליפת אפשרויות לשאלות אמריקאיות
            for question in questions:
                if question['question_type'] == 'multiple_choice':
                    cursor.execute("""
                        SELECT option_letter, option_text, is_correct
                        FROM question_options 
                        WHERE question_id = %s 
                        ORDER BY option_letter
                    """, (question['id'],))
                    question['options'] = cursor.fetchall()

            exam['questions'] = questions
            return exam

    except Exception as e:
        logger.error(f"Database error in get_exam_with_questions_for_teacher: {e}")
        return None