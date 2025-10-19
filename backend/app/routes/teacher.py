import logging

from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt

from app.services.teacher import get_teacher_id_by_email_service, get_teacher_exams_service, create_exam_service, get_exam_with_questions_service

logger = logging.getLogger(__name__)

teacher_bp = Blueprint('teacher', __name__, url_prefix='/api/teacher')


@teacher_bp.route('/exams', methods=['GET'])  # ללא teacher_id
@jwt_required()
def get_teacher_exams():
    try:
        claims = get_jwt()
        teacher_email = claims.get('email')
        teacher_id = claims.get('teacher_id')

        if claims.get('role') != 'teacher':
            return jsonify({'error': 'Teacher access required'}), 403

        # אם אין teacher_id בטוקן, חפש לפי email
        if not teacher_id:
            teacher_result  = get_teacher_id_by_email_service(teacher_email)
            if not teacher_result ['success']:
                return jsonify(teacher_id), 403
            teacher_id = teacher_result ['teacher_id']
        result = get_teacher_exams_service(teacher_id)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        logger.error(f"Error in get_teacher_exams route: {e}")
        return jsonify({'error': 'Server error'}), 500


@teacher_bp.route('/exam/<int:exam_id>/view', methods=['GET'])
@jwt_required()
def view_exam(exam_id):
    try:
        claims = get_jwt()
        teacher_email = claims.get('email')
        teacher_id = claims.get('teacher_id')

        if claims.get('role') != 'teacher':
            logger.warning(f"Non-teacher user {claims.get('email')} tried to view exam")
            return jsonify({'error': 'Teacher access required'}), 403

        # אם אין teacher_id בטוקן, חפש לפי email
        if not teacher_id:
            teacher_result = get_teacher_id_by_email_service(teacher_email)
            if not teacher_result['success']:
                logger.error(f"Failed to find teacher ID for email: {teacher_email}")
                return jsonify({'error': 'Teacher not found'}), 404
            teacher_id = teacher_result['teacher_id']

        result = get_exam_with_questions_service(exam_id, teacher_id)

        if result['success']:
            logger.info(f"Teacher {teacher_email} viewed exam {exam_id}")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to get exam {exam_id} for teacher {teacher_email}")
            return jsonify(result), 404

    except Exception as e:
        logger.error(f"Error in view_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/results', methods=['GET'])
@jwt_required()
def get_exam_results(exam_id):
    pass


@teacher_bp.route('/create-exam', methods=['POST'])
@jwt_required()
def create_exam():
    try:
        claims = get_jwt()
        teacher_email = claims.get('email')
        teacher_id = claims.get('teacher_id')

        if claims.get('role') != 'teacher':
            logger.warning(f"Non-teacher user {claims.get('email')} tried to create exam")
            return jsonify({'error': 'Teacher access required'}), 403

        # אם אין teacher_id בטוקן, חפש לפי email
        if not teacher_id:
            teacher_result = get_teacher_id_by_email_service(teacher_email)
            if not teacher_result['success']:
                logger.error(f"Failed to find teacher ID for email: {teacher_email}")
                return jsonify({'error': 'Teacher not found'}), 404
            teacher_id = teacher_result['teacher_id']

        data = request.get_json()

        # ולידציה בסיסית
        if not data or not data.get('title') or not data.get('questions'):
            return jsonify({'error': 'Missing required fields'}), 400

        result = create_exam_service(teacher_id, data)

        if result['success']:
            logger.info(f"Teacher {teacher_email} created exam: {result.get('exam_code')}")
            return jsonify(result), 201
        else:
            logger.error(f"Failed to create exam for teacher {teacher_email}: {result.get('error')}")
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error in create_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500