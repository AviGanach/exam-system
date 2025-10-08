import logging

from flask import Blueprint, request, jsonify

from app.services.auth import login_admin_teacher_services, verify_admin_code_services

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login_admin_teacher():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        result = login_admin_teacher_services(email, password)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 401

    except Exception as e:
        logger.error(f"Unexpected error in route: {e}")
        return jsonify({'error': 'Server error'}), 500

# לאחר שהאדמין הזין את הקוד שקיבל במייל
@auth_bp.route('/verify-admin', methods=['POST'])
def verify_admin():
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        if not email or not code:
            return jsonify({'error': 'Email and code are required'}), 400

        result = verify_admin_code_services(email, code)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 401

    except Exception as e:
        logger.error(f"Unexpected error in verify_admin route: {e}")
        return jsonify({'error': 'Server error'}), 500