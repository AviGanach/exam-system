import logging

from typing import Dict, Any, Optional
from datetime import timedelta

from flask_jwt_extended import create_access_token

from app.models.auth import get_teacher_password, verify_and_clear_admin_code, ensure_teacher_exists
from app.models.admin import is_admin_email, save_admin_verification_code
from app.utils.helpers import generate_verification_code
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

def login_admin_teacher_services(email: str, password: str) -> Dict[str, Any]:
    """מטפל בכל תהליך ההתחברות אדמין/מורה"""
    try:
        # בדיקת סיסמת מורים מול מה ששמור בDB
        stored_password = get_teacher_password()

        if not stored_password or stored_password != password:
            return {'success': False, 'message': 'Invalid password'}

        # בדיקה אם זה אדמין
        if is_admin_email(email):
            # יצירת קוד + שמירה + שליחת מייל
            verification_code = generate_verification_code()

            if not save_admin_verification_code(email, verification_code):
                return {'success': False, 'error': 'Failed to save verification code'}

            email_result = email_service.send_admin_verification_code(email, verification_code)
            if not email_result['success']:
                return {'success': False, 'error': 'Failed to send verification email'}

            return {
                'success': True,
                'is_admin': True,
                'message': 'Verification code sent to your email',
                'requires_verification': True
            }

        #  מורה רגיל - וודא שקיים בטבלה אם לא, מכניס אותו ומחזיר את הID
        teacher_id: Optional[int] = ensure_teacher_exists(email)

        # מורה רגיל - יוצר JWT מיד
        access_token = create_access_token(
            identity=email,
            expires_delta=timedelta(hours=8),  # 8 שעות לעבודה
            additional_claims={
                'role': 'teacher',
                'email': email,
                'teacher_id': teacher_id
            }
        )
        return {
            'success': True,
            'is_admin': False,
            'message': 'Teacher login successful',
            'access_token': access_token
        }
    except Exception as e:
        logger.error(f"Error in login_services: {e}")
        return {'success': False, 'error': 'An error occurred during login'}


def verify_admin_code_services(email: str, code: str) -> Dict[str, Any]:
    """מאמת קוד אימות של אדמין ויוצר JWT"""
    try:
        # בדיקת הקוד מול DB
        if not verify_and_clear_admin_code(email, code):
            return {'success': False, 'message': 'Invalid or expired verification code'}

        # יצירת JWT לאדמין
        access_token: str = create_access_token(
            identity=email,
            expires_delta=timedelta(hours=12),
            additional_claims={
                'role': 'admin',
                'email': email,
                'verified': True
            }
        )

        return {
            'success': True,
            'message': 'Admin verified successfully',
            'access_token': access_token,
            'role': 'admin'
        }

    except Exception as e:
        logger.error(f"Error in verify_admin_code_services: {e}")
        return {'success': False, 'error': 'An error occurred during verification'}