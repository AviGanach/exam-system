import logging

from typing import List, Dict, Any

from app.db import db_cursor

logger = logging.getLogger(__name__)

def get_question_by_id(question_id: int) -> dict | None:
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("""
                SELECT id, question_text, question_type, points, correct_answer
                FROM questions
                WHERE id = %s
            """, (question_id,))
            return cursor.fetchone()
    except Exception as e:
        logger.error(f"DB error in get_question_by_id: {e}")
        return None

def update_questions_in_db(exam_id: int, questions: List[Dict[str, Any]]) -> bool:
    """מעדכן שאלות למבחן במסד הנתונים - עם טרנזקציה מוגנת"""
    try:
        logger.info(f"Starting update_questions_in_db for exam {exam_id} with {len(questions)} questions")

        with db_cursor() as (conn, cursor):
            # התחלת טרנזקציה מפורשת
            conn.autocommit = False

            try:
                # # 1. מחיקת תשובות סטודנטים תחילה
                # cursor.execute("""
                #     DELETE FROM student_answers
                #     WHERE question_id IN (SELECT id FROM questions WHERE exam_id = %s)
                # """, (exam_id,))
                # deleted_answers = cursor.rowcount
                # logger.info(f"Deleted {deleted_answers} student answers")

                # 2. מחיקת אפשרויות השאלות
                cursor.execute("""
                    DELETE FROM question_options 
                    WHERE question_id IN (SELECT id FROM questions WHERE exam_id = %s)
                """, (exam_id,))
                deleted_options = cursor.rowcount
                logger.info(f"Deleted {deleted_options} question options")

                # 3. מחיקת השאלות עצמן
                cursor.execute("DELETE FROM questions WHERE exam_id = %s", (exam_id,))
                deleted_questions = cursor.rowcount
                logger.info(f"Deleted {deleted_questions} questions")

                # 4. יצירת השאלות החדשות
                for i, question in enumerate(questions):
                    cursor.execute("""
                        INSERT INTO questions (
                            exam_id, question_text, question_type, correct_answer, points, question_order,
                            programming_language, initial_code
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        exam_id,
                        question['question_text'],
                        question['question_type'],
                        question['correct_answer'],
                        question.get('points', 1),
                        i + 1,
                        question.get('programming_language'),
                        question.get('initial_code'),
                    ))

                    question_id = cursor.lastrowid

                    # 5. יצירת אפשרויות לשאלות אמריקאיות
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

                # אם הכל הצליח - commit
                conn.commit()
                logger.info(f"✅ Successfully updated {len(questions)} questions for exam {exam_id}")
                return True

            except Exception as inner_error:
                # אם משהו נכשל - rollback לכל הטרנזקציה
                conn.rollback()
                logger.error(f"❌ Transaction rolled back due to error: {inner_error}")
                raise inner_error

            finally:
                conn.autocommit = True  # החזרת autocommit

    except Exception as e:
        logger.error(f"Database error in update_questions_in_db: {e}")
        return False