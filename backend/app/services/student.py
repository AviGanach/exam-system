import logging

from datetime import timedelta
from typing import Dict, Any

from flask_jwt_extended import create_access_token

from app.models.exam import get_exam_inpo_by_code, is_exam_available
from app.models.student import get_or_create_student, get_student_exam_status

logger = logging.getLogger(__name__)

def register_student_for_exam(name: str, id_number: str, email: str, exam_code: str) -> Dict[str, Any]:
    """רושם תלמיד למבחן ויוצר JWT"""
    try:
        # בדיקה שהמבחן קיים וזמין
        exam = get_exam_inpo_by_code(exam_code)
        if not exam:
            return {'success': False, 'message': 'Exam not found'}

        if not is_exam_available(exam['id']):
            return {'success': False, 'message': 'Exam is not currently available'}

        # שליפת תלמיד
        student_id = get_or_create_student(name, id_number, email)
        if not student_id:
            return {'success': False, 'error': 'Failed to create student record'}

        # בדיקה שהתלמיד לא עשה את המבחן כבר
        exam_status = get_student_exam_status(student_id, exam['id'])

        if exam_status['exists']:
            if exam_status['end_time']: # יש זמן סיום בDB
                return {'success': False, 'message': 'Student has already completed this exam'}
            else:  # in_progress
                return {
                    'success': True,
                    'message': 'Student has exam in progress - can continue',
                    'resume_exam': True,
                    'submission_id': exam_status['submission_id']
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