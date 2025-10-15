import logging

from typing import Dict, Any

from app.models.admin import update_teacher_password_in_db, update_admin_email_in_db
from app.models.auth import get_teacher_password as get_password_from_db


logger = logging.getLogger(__name__)


def get_teacher_password_service() -> Dict[str, Any]:
    """מחזיר את סיסמת המורים הנוכחית"""
    try:
        logger.info("Attempting to retrieve teacher password from database")
        password = get_password_from_db()
        if password:
            logger.info("Successfully retrieved teacher password")
            return {'success': True, 'password': password}
        else:
            logger.warning("Teacher password not found in database")
            return {'success': False, 'error': 'Password not found'}

    except Exception as e:
        logger.error(f"Error in get_teacher_password service: {e}")
        return {'success': False, 'error': 'Failed to retrieve password'}


def update_teacher_password(new_password: str) -> Dict[str, Any]:
    """מעדכן את סיסמת המורים"""
    try:
        logger.info("Attempting to update teacher password")
        success = update_teacher_password_in_db(new_password)

        if success:
            logger.info("Teacher password updated successfully")
            return {'success': True, 'message': 'Password updated successfully'}
        else:
            logger.error("Failed to update teacher password in database")
            return {'success': False, 'error': 'Failed to update password'}

    except Exception as e:
        logger.error(f"Error in update_teacher_password service: {e}")
        return {'success': False, 'error': 'Failed to update password'}


def update_admin_email(old_email: str, new_email: str) -> Dict[str, Any]:
    """מעדכן את כתובת המייל של האדמין"""
    try:
        logger.info(f"Attempting to update admin email from {old_email} to {new_email}")
        success = update_admin_email_in_db(old_email, new_email)

        if success:
            logger.info(f"Admin email updated successfully from {old_email} to {new_email}")
            return {'success': True, 'message': 'Email updated successfully'}
        else:
            logger.error(f"Failed to update admin email from {old_email} to {new_email}")
            return {'success': False, 'error': 'Failed to update email'}

    except Exception as e:
        logger.error(f"Error in update_admin_email service: {e}")
        return {'success': False, 'error': 'Failed to update email'}