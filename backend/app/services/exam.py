import logging

from typing import Dict, Any
from datetime import datetime

from app.models.exam import get_exam_inpo_by_code, is_exam_available
from app.models.exam import get_exam
from app.models.student import start_exam_submission

logger = logging.getLogger(__name__)

def get_exam_info_service(exam_code: str) -> Dict[str, Any]:
    """מחזיר מידע על מבחן ללא השאלות"""
    try:
        # בדיקה שהמבחן קיים
        exam = get_exam_inpo_by_code(exam_code)
        if not exam:
            return {'success': False, 'message': 'Exam not found'}

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


def get_exam_service(exam_code: str, student_id: int, exam_id: int) -> Dict[str, Any]:
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