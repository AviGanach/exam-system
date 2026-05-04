import logging
import secrets
import string

from typing import Dict, Any
from datetime import datetime


from app.models.exam import create_exam_in_db, update_exam_details_db, update_exam_max_score, get_exam_info_by_code, \
    is_exam_available, get_exam, get_exam_completion_settings
from app.models.exam_submission import start_exam_submission, finalize_submission, check_exam_has_submissions
from app.models.student_answer import insert_student_answer
from app.models.question import get_question_by_id, update_questions_in_db
from app.models.teacher import create_questions_in_db
from app.utils.helpers import grade_open_text_question_with_ai, grade_code_question_with_ai


logger = logging.getLogger(__name__)

def generate_exam_code() -> str:
    """יוצר קוד מבחן ייחודי"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

def get_exam_info_service(exam_code: str) -> Dict[str, Any]:
    """מחזיר מידע על מבחן ללא השאלות"""
    try:
        # בדיקה שהמבחן קיים
        exam = get_exam_info_by_code(exam_code)
        if not exam:
            return {'success': False, 'message': 'Exam not found'}
        print("CHECK 22")
        # בדיקת זמינות המבחן
        is_available = is_exam_available(exam['id'])

        # הכנת המידע לתלמיד
        exam_info = {
            'title': exam['title'],
            'description': exam['description'],
            'duration_minutes': exam['duration_minutes'],
            'passing_grade': exam['passing_grade'],
            'show_timer': exam['show_timer'],
            'track_window_switches': exam['track_window_switches'],
            'max_score': exam['max_score'],
            'is_available': is_available,
            'start_time': exam['start_time'].isoformat() if exam['start_time'] else None,
            'end_time': exam['end_time'].isoformat() if exam['end_time'] else None
        }

        # הודעות סטטוס
        if not is_available:
            if exam['start_time'] and datetime.now() < exam['start_time']:
                message = f"Exam will be available from {exam['start_time']}"
            elif exam['end_time'] and datetime.now() > exam['end_time']:
                message = "Exam is no longer available"
            else:
                message = "Exam is not currently available"
        else:
            message = "Exam is available"

        return {
            'success': True,
            'exam_info': exam_info,
            'message': message
        }

    except Exception as e:
        logger.error(f"Error in get_exam_info_service: {e}")
        return {'success': False, 'error': 'Failed to get exam information'}


def create_exam_service(teacher_id: int, exam_data: Dict[str, Any]) -> Dict[str, Any]:
    """יוצר מבחן חדש עם השאלות שלו"""
    try:
        logger.info(f"Creating exam for teacher {teacher_id}: {exam_data.get('title')}")

        # יצירת קוד מבחן ייחודי
        exam_code = generate_exam_code()

        # הכנת נתוני המבחן
        exam_details = {
            'teacher_id': teacher_id,
            'exam_code': exam_code,
            'title': exam_data['title'],
            'description': exam_data.get('description', ''),
            'duration_minutes': exam_data.get('duration_minutes', 60),
            'passing_grade': exam_data.get('passing_grade', 60),
            'start_time': exam_data.get('start_time') if exam_data.get('start_time') else None,
            'end_time': exam_data.get('end_time') if exam_data.get('end_time') else None,
            'show_timer': exam_data.get('show_timer', True),
            'show_grade_immediately': exam_data.get('show_grade_immediately', False),
            'show_review_after_exam': exam_data.get('show_review_after_exam', False),
            'track_window_switches': exam_data.get('track_window_switches', True),
            'status': exam_data.get('status', 'draft'),
            'max_score': sum(q.get('points', 1) for q in exam_data['questions'])
        }

        # יצירת המבחן במסד הנתונים
        exam_id = create_exam_in_db(exam_details)
        if not exam_id:
            return {'success': False, 'error': 'Failed to create exam'}
        print(exam_data['questions'])
        # יצירת השאלות
        questions_result = create_questions_in_db(exam_id, exam_data['questions'])
        if not questions_result:
            return {'success': False, 'error': 'Failed to create questions'}

        logger.info(f"Successfully created exam {exam_code} with {len(exam_data['questions'])} questions")
        return {
            'success': True,
            'message': 'Exam created successfully',
            'exam_id': exam_id,
            'exam_code': exam_code
        }

    except Exception as e:
        logger.error(f"Error in create_exam_service: {e}")
        return {'success': False, 'error': 'Failed to create exam'}

def update_exam_details_service(exam_id: int, teacher_id: int, exam_data: Dict[str, Any]) -> Dict[str, Any]:
    """עדכון הגדרות המבחן בלבד"""
    try:
        logger.info(f"Updating exam details for exam {exam_id}")

        # הכנת נתוני המבחן (בלי השאלות)
        exam_details = {
            'title': exam_data['title'],
            'description': exam_data.get('description', ''),
            'duration_minutes': exam_data.get('duration_minutes', 60),
            'passing_grade': exam_data.get('passing_grade', 60),
            'start_time': exam_data.get('start_time'),
            'end_time': exam_data.get('end_time'),
            'show_timer': exam_data.get('show_timer', True),
            'show_grade_immediately': exam_data.get('show_grade_immediately', False),
            'show_review_after_exam': exam_data.get('show_review_after_exam', False),
            'track_window_switches': exam_data.get('track_window_switches', True),
            'status': exam_data.get('status', 'draft'),
            'max_score': exam_data.get('max_score', 0)
        }

        # עדכון פרטי המבחן
        exam_updated = update_exam_details_db(exam_id, teacher_id, exam_details)
        if not exam_updated:
            return {'success': False, 'error': 'Failed to update exam details'}

        logger.info(f"Successfully updated details for exam {exam_id}")
        return {'success': True, 'message': 'Exam details updated successfully'}

    except Exception as e:
        logger.error(f"Error in update_exam_details_service: {e}")
        return {'success': False, 'error': 'Server error while updating exam details'}

def update_exam_content_service(exam_id: int, teacher_id: int, exam_data: Dict[str, Any]) -> Dict[str, Any]:
    """עדכון תוכן המבחן עם בדיקת הגשות"""
    try:
        logger.info(f"Updating exam content for exam {exam_id}")

        # בדיקה אם יש הגשות למבחן
        submission_stats = check_exam_has_submissions(exam_id, teacher_id)
        if submission_stats is None:
            return {'success': False, 'error': 'Failed to check exam submissions'}

        has_active_submissions = submission_stats['completed'] + submission_stats['in_progress'] > 0

        if has_active_submissions:
            total_count = submission_stats['completed'] + submission_stats['in_progress'] + submission_stats[
                'abandoned']
            return {
                'success': False,
                'error': 'Cannot update content of exam with submissions',
                'has_submissions': True,
                'submission_count': total_count,
                'stats': submission_stats,
                'status_code': 409  # Conflict
            }
        # חישוב ניקוד מקסימלי חדש
        total_points = 0
        for q in exam_data.get('questions', []):
            points_value = q.get('points', 1)
            if isinstance(points_value, str):
                total_points += int(float(points_value))
            else:
                total_points += int(points_value)

        logger.info(f"New total points calculated: {total_points}")

        # אין הגשות - אפשר לעדכן תוכן
        questions_updated = update_questions_in_db(exam_id, exam_data['questions'])
        if not questions_updated:
            return {'success': False, 'error': 'Failed to update questions'}

        # עדכון max_score בטבלת המבחנים
        max_score_updated = update_exam_max_score(exam_id, teacher_id, total_points)
        if not max_score_updated:
            logger.warning(f"Failed to update max_score for exam {exam_id}")
            # לא נכשל כי השאלות כבר עודכנו, רק נתן אזהרה

        logger.info(f"Successfully updated content for exam {exam_id} with new max_score: {total_points}")
        return {
            'success': True,
            'message': 'Exam content updated successfully',
            'new_max_score': total_points
        }

    except Exception as e:
        logger.error(f"Error in update_exam_content_service: {e}")
        return {'success': False, 'error': 'Server error while updating exam content'}


def get_exam_service(student_id: int, exam_id: int) -> Dict[str, Any]:
    """מחזיר את המבחן המלא ויוצר submission"""
    try:
        # שליפת המבחן עם השאלות
        exam_data = get_exam(exam_id)
        if not exam_data:
            return {'success': False, 'message': 'Exam not found'}

        # בדיקה שהמבחן עדיין זמין
        if not is_exam_available(exam_id):
            return {'success': False, 'message': 'Exam is no longer available'}

        # יצירת submission (התחלת המבחן)
        submission_id = start_exam_submission(student_id, exam_id, exam_data['max_score'])
        if not submission_id:
            return {'success': False, 'error': 'Failed to start exam'}

        # הכנת נתוני המבחן לתלמיד
        exam_response = {
            'exam_info': {
                'title': exam_data['title'],
                'description': exam_data['description'],
                'duration_minutes': exam_data['duration_minutes'],
                'show_timer': exam_data['show_timer'],
                # 'show_review_after_exam': exam_data['show_review_after_exam'],
                'track_window_switches': exam_data['track_window_switches'],
                'max_score': exam_data['max_score'],
                'total_questions': len(exam_data['questions'])
            },
            'questions': exam_data['questions'],
            'submission_id': submission_id
        }

        return {
            'success': True,
            'exam': exam_response,
            'message': 'Exam loaded successfully'
        }

    except Exception as e:
        logger.error(f"Error in get_full_exam_service: {e}")
        return {'success': False, 'error': 'Failed to load exam'}

def calculate_question_score(question: dict, answer: dict) -> tuple[int, str]:
    """חישוב ניקוד עבור שאלה בודדת"""
    try:
        selected_option = answer.get("selected_option")
        print(4141,selected_option)
        open_answer = answer.get("open_answer")
        code_answer = answer.get("code_answer")
        question_text = question.get("question_text", "")

        if question["question_type"] == "multiple_choice" and selected_option:
            selected_option = selected_option[0].upper()  # רק התו הראשון
            print(4141, selected_option)
            if selected_option == question["correct_answer"]:
                return question["points"], ""
            return 0, ''

        elif question["question_type"] == "open_text":
            return grade_open_text_question_with_ai(
                question_text,
                question.get("correct_answer", ""),
                open_answer,
                question["points"]
            )

        elif question["question_type"] == "code":
            return grade_code_question_with_ai(
                question_text,
                question.get("correct_answer", ""),
                code_answer,
                question["points"],
                question.get("programming_language", "python")
            )

        return 0, ""

    except Exception as e:
        logger.error(f"Error calculating score for question {question.get('id', 'unknown')}: {e}")
        return 0, ""


def save_student_answer(submission_id: int, question: dict, answer: dict, score: float, ai_explanation: str) -> bool:
    """שמירת תשובת תלמיד במסד הנתונים"""
    try:
        selected_option = (answer.get("selected_option") or "")[:1].upper()
        open_answer = answer.get("open_answer")
        code_answer = answer.get("code_answer")

        # קביעת טקסט התשובה
        answer_text = open_answer or code_answer or selected_option
        print(4242, answer_text)
        return insert_student_answer(
            submission_id=submission_id,
            question_id=answer["question_id"],
            answer_text=answer_text,
            selected_option=selected_option,
            score=score,
            max_question_score=question["points"],
            ai_explanation = ai_explanation
        )
    except Exception as e:
        logger.error(f"Error saving answer for question {answer.get('question_id', 'unknown')}: {e}")
        return False


def process_exam_answers(submission_id: int, answers: list) -> dict:
    """עיבוד כל התשובות וחישוב הציון הכולל"""
    try:
        total_score = 0
        processed_answers = 0

        logger.info(f"Starting grading process for submission {submission_id}")
        print("answers received:", answers, type(answers))

        for answer in answers:
            # טעינת השאלה
            question = get_question_by_id(answer["question_id"])
            print("submit_exam_service", question)
            print("answers", answer)

            if not question:
                logger.warning(f"Question {answer['question_id']} not found")
                continue

            if not question.get("question_text"):
                logger.warning(f"Question text not found for question {answer['question_id']}")
                continue

            print("question_text -- ", question.get("question_text"))
            print("type", question["question_type"])

            # חישוב ניקוד השאלה והסבר AI לתשובות פתוחות וקוד
            question_score, ai_explanation = calculate_question_score(question, answer)

            # שמירת התשובה
            if not save_student_answer(submission_id, question, answer, question_score, ai_explanation):
                logger.warning(f"Failed to save answer {answer['question_id']}")
                return {
                    'success': False,
                    'error': f'Failed to save answer for question {answer["question_id"]}'
                }

            total_score += question_score
            processed_answers += 1

        return {
            'success': True,
            'total_score': total_score,
            'processed_answers': processed_answers
        }

    except Exception as e:
        logger.error(f"Error processing answers: {e}")
        return {'success': False, 'error': 'Error processing answers'}


def prepare_response(exam_id: int, total_score: float) -> dict:
    """הכנת תגובה לתלמיד על בסיס הגדרות המבחן"""
    try:
        exam_info = get_exam_completion_settings(exam_id)

        if not exam_info:
            return {
                "success": False,
                "message": "Could not retrieve exam information"
            }

        print("show_grade_and_passing_grade", exam_info)
        show_grade = exam_info["show_grade_immediately"]

        response = {
            "success": True,
            "message": "Exam submitted and graded successfully",
            "show_review_after_exam": bool(exam_info["show_review_after_exam"]),
        }

        if show_grade:
            response.update({
                "show_grade": True,
                "final_score": total_score,
                "passed": total_score >= exam_info["passing_grade"]
            })
        else:
            response["show_grade"] = False

        return response

    except Exception as e:
        logger.error(f"Error preparing response: {e}")
        return {"success": False, "message": "Error preparing response"}


def submit_exam_service(exam_id, data: dict):
    """
    שומר את כל תשובות התלמיד - פונקציה ראשית מקוצרת
    """
    try:
        # חילוץ וולידציה של הנתונים
        submission_id = data.get('submission_id')
        answers = data.get('answers', [])
        window_switches = data.get('window_switches', 0)
        total_away_time = data.get('total_away_time', 0)
        print("submit_exam-service", submission_id, len(answers), window_switches, total_away_time)
        # עיבוד התשובות
        processing_result = process_exam_answers(submission_id, answers)
        print("Processing result:", processing_result)

        if not processing_result['success']:
            return processing_result

        total_score = processing_result['total_score']

        # מסיים את ההגשה עם כל הנתונים
        submission_complete = finalize_submission(
            submission_id,
            total_score,
            window_switches,
            total_away_time
        )

        if not submission_complete:
            return {'success': False, 'message': 'Failed to finalize submission'}

        # הכנת התגובה לתלמיד
        return prepare_response(exam_id, total_score)

    except Exception as e:
        logger.error(f"Error in submit_exam_service: {e}")
        return {"success": False, "message": "Server error during submission"}