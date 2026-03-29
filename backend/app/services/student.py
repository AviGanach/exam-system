import logging

from datetime import timedelta
from typing import Dict, Any

from flask_jwt_extended import create_access_token

from app.models.exam import get_exam_info_by_code, is_exam_available
from app.models.exam_submission import get_submission_status_by_student
from app.models.student import get_or_create_student

logger = logging.getLogger(__name__)

def register_student_for_exam(name: str, id_number: str, email: str, exam_code: str) -> Dict[str, Any]:
    """רושם תלמיד למבחן ויוצר JWT"""
    try:
        # בדיקה שהמבחן קיים וזמין
        exam = get_exam_info_by_code(exam_code)
        if not exam:
            return {'success': False, 'message': 'Exam not found'}

        if not is_exam_available(exam['id']):
            return {'success': False, 'message': 'Exam is not currently available'}

        # שליפת תלמיד
        student_id = get_or_create_student(name, id_number, email)
        if not student_id:
            return {'success': False, 'error': 'Failed to create student record'}

        # בדיקה שהתלמיד לא עשה את המבחן כבר שאין רשומה על שמו או אם יש שהסטטוס שונה מcompleted
            # בדיקה שהתלמיד לא עשה את המבחן כבר
        status_result = get_submission_status_by_student(student_id, exam['id'])

        # בדיקה אם הייתה שגיאה בDB
        if not status_result['success']:
            logger.error(f"Database error checking submission status: {status_result.get('error')}")
            return {
                'success': False,
                'message': 'Database error while checking submission status'
            }

        # עכשיו אפשר לבדוק בבטחה
        if status_result['found'] and status_result['status'] == 'completed':
            return {
                'success': False,
                'message': 'You have already completed this exam'
            }

        # יצירת JWT
        access_token = create_access_token(
            identity=f"student_{student_id}",
            expires_delta=timedelta(minutes=exam['duration_minutes'] + 30),  # זמן מבחן + 30 דק buffer
            additional_claims={
                'role': 'student',
                'student_id': student_id,
                'exam_id': exam['id'],
                'exam_code': exam_code
            }
        )

        return {
            'success': True,
            'message': 'Student registered successfully',
            'access_token': access_token,
            'exam_duration': exam['duration_minutes']
        }

    except Exception as e:
        logger.error(f"Error in register_student_for_exam: {e}")
        return {'success': False, 'error': 'Registration failed'}