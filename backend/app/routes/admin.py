import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.services.admin import update_teacher_password, update_admin_email, get_teacher_password_service

logger = logging.getLogger(__name__)
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/teacher-password', methods=['GET'])
@jwt_required()
def get_teacher_password():
    try:
        claims = get_jwt()
        if claims.get('role') != 'admin':
            logger.warning(f"Non-admin user {claims.get('email')} tried to access teacher password")
            return jsonify({'error': 'Admin access required'}), 403

        result = get_teacher_password_service()
        if result['success']:
            logger.info(f"Admin {claims.get('email')} retrieved teacher password")
            return jsonify(result)
        else:
            logger.error(f"Failed to get teacher password: {result.get('error')}")
            return jsonify(result), 500

    except Exception as e:
        logger.error(f"Error in get_teacher_password_route: {e}")
        return jsonify({'error': 'Server error'}), 500


@admin_bp.route('/update-teacher-password', methods=['POST'])
@jwt_required()
def update_teacher_password_route():
    try:
        claims = get_jwt()
        if claims.get('role') != 'admin':
            logger.warning(f"Non-admin user {claims.get('email')} tried to update teacher password")
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()
        new_password = data.get('newPassword')

        if not new_password:
            return jsonify({'error': 'New password is required'}), 400

        result = update_teacher_password(new_password)

        if result['success']:
            logger.info(f"Admin {claims.get('email')} updated teacher password")
        else:
            logger.error(f"Failed to update teacher password: {result.get('error')}")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in update_teacher_password_route: {e}")
        return jsonify({'error': 'Server error'}), 500


@admin_bp.route('/update-email', methods=['POST'])
@jwt_required()
def update_admin_email_route():
    try:
        claims = get_jwt()
        if claims.get('role') != 'admin':
            logger.warning(f"Non-admin user {claims.get('email')} tried to update admin email")
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()
        new_email = data.get('newEmail')

        if not new_email:
            return jsonify({'error': 'New email is required'}), 400

        admin_email = claims.get('email')
        result = update_admin_email(admin_email, new_email)

        if result['success']:
            logger.info(f"Admin email updated from {admin_email} to {new_email}")
        else:
            logger.error(f"Failed to update admin email: {result.get('error')}")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in update_admin_email_route: {e}")
        return jsonify({'error': 'Server error'}), 500