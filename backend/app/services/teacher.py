import logging

from typing import Dict, Any

from app.models.exam import delete_exam_cascade
from app.models.exam_submission import check_exam_has_submissions, delete_exam_submissions_and_student_answers, get_submissions_with_answers
from app.models.teacher import get_exams_by_teacher_id, get_teacher_id_by_email, get_exam_with_questions_for_teacher
from app.utils.export import create_submissions_export_file, cleanup_export_file


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


def delete_exam_service(exam_id: int, teacher_id: int, force_delete: bool = False) -> Dict[str, Any]:
    """שירות מחיקת מבחן של מורה"""
    try:
        logger.info(f"Attempting to delete exam {exam_id} for teacher {teacher_id}")

        # בדיקה כמה הגשות יש למבחן
        submission_stats = check_exam_has_submissions(exam_id, teacher_id)

        if submission_stats is None:
            return {
                'success': False,
                'error': 'Failed to check exam submissions'
            }

        # אם יש הגשות ולא נדרשה מחיקה כפויה
        if submission_stats['in_progress']+submission_stats['completed'] > 0 and not force_delete:
            message = f"למבחן יש {submission_stats['completed']} הגשות מושלמות"
            if submission_stats['in_progress'] > 0:
                message += f" ו-{submission_stats['in_progress']} הגשות בתהליך"

            return {
                'success': False,
                'error': 'Cannot delete exam with submissions',
                'submission_stats': submission_stats,
                'message': message,
                'requires_confirmation': True
            }

        # מחיקת המבחן (קריאה לשכבת המודל)
        success = delete_exam_cascade(exam_id, teacher_id)

        if success:
            logger.info(f"Successfully deleted exam {exam_id} for teacher {teacher_id}")
            return {
                'success': True,
                'message': 'Exam deleted successfully'
            }
        else:
            return {
                'success': False,
                'error': 'Failed to delete exam'
            }

    except Exception as e:
        logger.error(f"Error in delete_exam_service: {e}")
        return {
            'success': False,
            'error': 'Server error while deleting exam'
        }

def get_submissions_service(exam_id: int, teacher_id: int) -> Dict[str, Any]:
    "מחזירה מידע על ההגשות של המבחן כמה סיימו כמה בתהליך וכמה הזניחו(עזבו באמצע, בלי שליחה)"
    try:
        logger.info(f"Fetching submissions for teacher {teacher_id}")

        # בדיקה כמה הגשות יש למבחן
        submission_stats = check_exam_has_submissions(exam_id, teacher_id)

        if submission_stats is None:
            return {
                'success': False,
                'error': 'Failed to check exam submissions'
            }
        else:
            return {
                'success': True,
                'submissions': submission_stats
            }
    except Exception as e:
        logger.error(f"Error in get_submissions_service: {e}")
        return {
            'success': False,
            'error': 'Failed to get submissions'
        }


def delete_exam_submissions_service(exam_id: int, teacher_id: int) -> Dict[str, Any]:
    """שירות מחיקת הגשות מבחן"""
    try:
        logger.info(f"Deleting submissions for exam {exam_id} by teacher {teacher_id}")

        # מחיקת ההגשות והתשובות
        deletion_result = delete_exam_submissions_and_student_answers(exam_id)

        if deletion_result['success']:
            logger.info(f"Successfully deleted {deletion_result['deleted_count']} submissions for exam {exam_id}")
            return {
                'success': True,
                'message': f"Successfully deleted {deletion_result['deleted_count']} submissions",
                'deleted_count': deletion_result['deleted_count'],
                'deleted_answers': deletion_result['deleted_answers']
            }
        else:
            return {'success': False, 'error': deletion_result['error']}

    except Exception as e:
        logger.error(f"Error in delete_exam_submissions_service: {e}")
        return {'success': False, 'error': 'Server error while deleting submissions'}

def export_submissions_service(exam_id: int, teacher_id: int) -> Dict[str, Any]:
    """שירות ייצוא הגשות להורדה בלבד"""
    try:
        # קבלת נתוני ההגשות
        submissions_data = get_submissions_with_answers(exam_id, teacher_id)
        if not submissions_data:
            return {'success': False, 'error': 'No submissions found'}

        submissions_count = len(submissions_data['submissions'])
        if submissions_count == 0:
            return {'success': False, 'error': 'No submissions to export'}

        # יצירת קובץ
        export_result = create_submissions_export_file(submissions_data, exam_id)
        if not export_result['success']:
            return {'success': False, 'error': 'Failed to create export file'}

        return {
            'success': True,
            'file_path': export_result['file_path'],
            'file_name': export_result['file_name'],
            'exported_count': submissions_count
        }

    except Exception as e:
        logger.error(f"Error in export_submissions_service: {e}")
        return {'success': False, 'error': 'Server error'}

def export_and_delete_submissions_service(exam_id, teacher_id, ) -> Dict[str, Any]:
    """שירות ייצוא הגשות ומחיקתן"""
    try:
        logger.info(f"Starting export and delete process for exam {exam_id}")
        # 1. קבלת נתונים
        submissions_data = get_submissions_with_answers(exam_id, teacher_id)
        if not submissions_data:
            return {'success': False, 'error': 'No submissions found'}
        # 2. יצירת קובץ ייצוא
        export_result = create_submissions_export_file(submissions_data,exam_id)
        print("---export_result--- ",export_result)
        if not export_result['success']:
            return {'success': False, 'error': 'Failed to create export file'}

        # מחיקה
        deletion_result = delete_exam_submissions_and_student_answers(exam_id)
        if not deletion_result['success']:
            # מחיקת הקובץ
            cleanup_export_file(export_result['file_path'])
            return {'success': False, 'error': 'Failed to delete submissions'}

        # החזר פרטי הקובץ להורדה
        return {
            'success': True,
            'file_path': export_result['file_path'],
            'file_name': export_result['file_name'],
            'exported_count': export_result['submissions_count'],
            'deleted_count': deletion_result['deleted_count']
        }

    except Exception as e:
        logger.error(f"Error in export_and_delete_submissions_service: {e}")
        return {'success': False, 'error': 'Server error'}

def get_exam_results_service(exam_id: int, teacher_id: int) -> Dict[str, Any]:
    try:
        logger.info(f"Getting exam results for exam {exam_id}")
        # 1. קבלת נתונים
        submissions_data = get_submissions_with_answers(exam_id, teacher_id)
        print("submissions_data", submissions_data)
        if not submissions_data:
            return {'success': False, 'error': 'No submissions found'}
        submissions_count = len(submissions_data['submissions'])
        if submissions_count == 0:
            return {'success': False, 'error': 'No submissions'}
        return {'success': True, 'submissions': submissions_data}
    except Exception as e:
        logger.error(f"Error in get_exam_results_service: {e}")
        return {'success': False, 'error': 'Server error'}
