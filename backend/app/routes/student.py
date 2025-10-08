import logging

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt

from app.services.exam import get_exam_info_service, get_exam_service
from app.services.student import register_student_for_exam

logger = logging.getLogger(__name__)

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


@student_bp.route('/register/<exam_code>', methods=['POST'])
def register(exam_code: str) -> tuple[Response, int]:
    """רישום תלמיד למבחן"""
    try:
        data = request.get_json()

        # ולידציה של נתונים
        name = data.get('name')
        id_number = data.get('id_number')
        email = data.get('email')

        if not all([name, id_number, email, exam_code]):
            return jsonify({'error': 'Name, ID number, email and exam code are required'}), 400

        # קריאה לservice
        result = register_student_for_exam(name, id_number, email, exam_code)

        if result['success']:
            return jsonify(result), 201
        else:
            status_code = 404 if 'not found' in result.get('message', '') else 400
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error in register route: {e}")
        return jsonify({'error': 'Server error'}), 500

@student_bp.route('/exam/<exam_code>', methods=['GET'])
def get_exam_info(exam_code: str) -> tuple[Response, int]:
    """מחזיר מידע על מבחן לפני רישום התלמיד"""
    try:
        if not exam_code:
            return jsonify({'error': 'Exam code is required'}), 400

        # קריאה לservice
        result = get_exam_info_service(exam_code)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        logger.error(f"Error in get_exam_info route: {e}")
        return jsonify({'error': 'Server error'}), 500

@student_bp.route('/exam/<exam_code>', methods=['GET'])
@jwt_required()
def get_exam(exam_code: str):
    """מחזיר את המבחן המלא עם השאלות לתלמיד מאומת"""
    try:
        # שליפת נתונים מה-JWT
        claims = get_jwt()
        student_id = claims.get('student_id')
        exam_id = claims.get('exam_id')
        token_exam_code = claims.get('exam_code')

        # ולידציות אבטחה
        if not student_id or not exam_id:
            return jsonify({'error': 'Invalid token - missing student or exam data'}), 401

        if token_exam_code != exam_code:
            return jsonify({'error': 'Token exam code does not match requested exam'}), 403

        # קריאה לservice
        result = get_exam_service(exam_code, student_id, exam_id)

        if result['success']:
            return jsonify(result), 201
        else:
            status_code = 404 if 'not found' in result.get('message', '') else 400
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error in get_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500