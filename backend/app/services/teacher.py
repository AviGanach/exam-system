import logging
import secrets
import string

from typing import Dict, Any, List
from app.models.teacher import get_exams_by_teacher_id, get_teacher_id_by_email, create_exam_in_db, create_questions_in_db, get_exam_with_questions_for_teacher

logger = logging.getLogger(__name__)


def get_teacher_id_by_email_service(teacher_email: str) -> Dict[str, Any]:
    """מחזיר את teacher_id לפי מייל המורה"""
    try:
        logger.info(f"Searching for teacher ID by email: {teacher_email}")

        teacher_id = get_teacher_id_by_email(teacher_email)

        if not teacher_id:
            logger.warning(f"Teacher not found for email: {teacher_email}")
            return {
                'success': False,
                'error': 'Teacher not found'
            }

        logger.info(f"Found teacher ID {teacher_id} for email: {teacher_email}")
        return {
            'success': True,
            'teacher_id': teacher_id
        }

    except Exception as e:
        logger.error(f"Error in get_teacher_id_by_email_service: {e}")
        return {
            'success': False,
            'error': 'Failed to retrieve teacher ID'
        }

def get_teacher_exams_service(teacher_id: int) -> Dict[str, Any]:
    """מחזיר את כל המבחנים של מורה ספציפי"""
    try:
        logger.info(f"Fetching exams for teacher ID: {teacher_id}")

        exams = get_exams_by_teacher_id(teacher_id)

        if exams is not None:
            logger.info(f"Found {len(exams)} exams for teacher {teacher_id}")
            return {
                'success': True,
                'exams': exams,
                'count': len(exams)
            }
        else:
            logger.warning(f"No exams found for teacher {teacher_id}")
            return {
                'success': True,
                'exams': [],
                'count': 0
            }

    except Exception as e:
        logger.error(f"Error in get_teacher_exams_service: {e}")
        return {
            'success': False,
            'error': 'Failed to fetch teacher exams'
        }

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
            'track_window_switches': exam_data.get('track_window_switches', True),
            'status': exam_data.get('status', 'draft'),
            'max_score': sum(q.get('points', 1) for q in exam_data['questions'])
        }

        # יצירת המבחן במסד הנתונים
        exam_id = create_exam_in_db(exam_details)
        if not exam_id:
            return {'success': False, 'error': 'Failed to create exam'}

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


def generate_exam_code() -> str:
    """יוצר קוד מבחן ייחודי"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def get_exam_with_questions_service(exam_id: int, teacher_id: int) -> Dict[str, Any]:
    """מחזיר מבחן מלא עם שאלות למורה"""
    try:
        logger.info(f"Getting exam {exam_id} for teacher {teacher_id}")

        exam_data = get_exam_with_questions_for_teacher(exam_id, teacher_id)

        if not exam_data:
            return {
                'success': False,
                'error': 'Exam not found or access denied'
            }

        logger.info(f"Successfully retrieved exam {exam_id} with {len(exam_data.get('questions', []))} questions")
        return {
            'success': True,
            'exam': exam_data
        }

    except Exception as e:
        logger.error(f"Error in get_exam_with_questions_service: {e}")
        return {
            'success': False,
            'error': 'Failed to get exam'
        }