import logging

from flask import Blueprint, request, jsonify, send_file, after_this_request
from flask_jwt_extended import jwt_required, get_jwt

from app.services.exam import create_exam_service, update_exam_details_service, update_exam_content_service
from app.services.teacher import get_teacher_id_by_email_service, get_teacher_exams_service, get_exam_with_questions_service, delete_exam_service, get_submissions_service, delete_exam_submissions_service, export_and_delete_submissions_service,export_submissions_service,get_exam_results_service
from app.utils.export import cleanup_export_file

logger = logging.getLogger(__name__)

teacher_bp = Blueprint('teacher', __name__, url_prefix='/api/teacher')


def validate_teacher_access(claims) -> tuple:
    """בדיקת הרשאות מורה והחזרת teacher_id ו-email

    Returns:
        tuple: (teacher_id, teacher_email) אם הכל תקין

    Raises:
        ValueError: אם יש בעיה בהרשאות או נתונים
    """
    # בדיקת תפקיד
    if claims.get('role') != 'teacher':
        raise ValueError(f"Access denied: Non-teacher user {claims.get('email')} attempted teacher operation")

    teacher_email = claims.get('email')
    teacher_id = claims.get('teacher_id')

    if not teacher_email:
        raise ValueError("No teacher email in token")

    # אם אין teacher_id בטוקן, חפש לפי email
    if not teacher_id:
        teacher_result = get_teacher_id_by_email_service(teacher_email)
        if not teacher_result['success']:
            raise ValueError(f"Teacher not found for email: {teacher_email}")
        teacher_id = teacher_result['teacher_id']

    return teacher_id, teacher_email

@teacher_bp.route('/exams', methods=['GET'])  # ללא teacher_id
@jwt_required()
def get_teacher_exams():
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

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
        teacher_id, teacher_email = validate_teacher_access(claims)

        result = get_exam_with_questions_service(exam_id, teacher_id)

        if result['success']:
            logger.info(f"Teacher {claims.get('email')} viewed exam {exam_id}")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to get exam {exam_id} for teacher {claims.get('email')}")
            return jsonify(result), 404

    except Exception as e:
        logger.error(f"Error in view_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/create-exam', methods=['POST'])
@jwt_required()
def create_exam():
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        data = request.get_json()
        print("DATA",data)
        # ולידציה בסיסית
        if not data or not data.get('title') or not data.get('questions'):
            return jsonify({'error': 'Missing required fields'}), 400

        result = create_exam_service(teacher_id, data)

        if result['success']:
            logger.info(f"Teacher {claims.get('email')} created exam: {result.get('exam_code')}")
            return jsonify(result), 201
        else:
            logger.error(f"Failed to create exam for teacher {claims.get('email')}: {result.get('error')}")
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error in create_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/update_details', methods=['PUT'])
@jwt_required()
def update_details(exam_id:int):
    """עדכון הגדרות המבחן בלבד"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # עדכון רק פרטי המבחן, לא השאלות
        result = update_exam_details_service(exam_id, teacher_id, data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error updating exam details: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/update_content', methods=['PUT'])
@jwt_required()
def update_context(exam_id:int):
    """עדכון תוכן המבחן (שאלות) בלבד"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # עדכון רק השאלות
        result = update_exam_content_service(exam_id, teacher_id, data)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error updating exam content: {e}")
        return jsonify({'error': 'Server error'}), 500


@teacher_bp.route('/exam/<int:exam_id>/delete', methods=['DELETE'])
@jwt_required()
def delete_exam(exam_id):
    """מחיקת מבחן"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        # קבלת פרמטר force מה-query string
        force_delete = request.args.get('force', 'false').lower() == 'true'

        result = delete_exam_service(exam_id, teacher_id, force_delete)

        if result['success']:
            logger.info(f"Teacher {teacher_email} deleted exam {exam_id}")
            return jsonify(result), 200
        else:
            status_code = 409 if result.get('requires_confirmation') else 400
            logger.error(f"Failed to delete exam {exam_id} for teacher {teacher_email}: {result.get('error')}")
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error in delete_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('exam/<int:exam_id>/submission', methods=['GET'])
@jwt_required()
def get_submissions(exam_id):
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        result = get_submissions_service(exam_id, teacher_id)
        if result['success']:
            logger.info(f"Submissions for teacher {teacher_email} have been retrieved")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to get submissions for teacher {teacher_email}: {result.get('error')}")
            return jsonify(result), 404
    except Exception as e:
        logger.error(f"Error in get_submissions route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/delete_submissions', methods=['DELETE'])
@jwt_required()
def delete_exam_submissions(exam_id):
    """מחיקת הגשות של מבחן"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        # מחיקת ההגשות
        result = delete_exam_submissions_service(exam_id, teacher_id)

        if result['success']:
            logger.info(f"Teacher {teacher_email} deleted submissions for exam {exam_id}")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to delete submissions for exam {exam_id}: {result.get('error')}")
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error in delete_exam_submissions route: {e}")
        return jsonify({'error': 'Server error'}), 500


@teacher_bp.route('/exam/<int:exam_id>/export_and_delete_submissions', methods=['POST'])
@jwt_required()
def export_and_delete_exam_submissions(exam_id):
    """ייצוא הגשות להורדה ומחיקתן"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        # ייצוא ומחיקה
        result = export_and_delete_submissions_service(exam_id, teacher_id)

        if result['success']:
            if result.get('file_path'):
                file_path = result['file_path']

                # מחק את הקובץ אחרי שה-response מסתיים
                @after_this_request
                def cleanup_file(response):
                    try:
                        cleanup_export_file(file_path)
                        logger.info(f"Cleaned up temp file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to cleanup: {e}")
                    return response

                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=result['file_name'],
                    mimetype='text/csv'
                )
        else:
            return jsonify(result), 400
    except Exception as e:
        logger.error(f"Error in export_and_delete_submissions route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/results', methods=['GET'])
@jwt_required()
def get_exam_results(exam_id):
    """קבלת תוצאות המבחן"""
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        result = get_exam_results_service(exam_id, teacher_id)
        if result['success']:
            logger.info("Exam results for teacher {teacher_email} have been retrieved")
            return jsonify(result), 200
        else:
            logger.error(f"Failed to get result for teacher {teacher_email}: {result.get('error')}")
            return jsonify(result), 404
    except Exception as e:
        logger.error(f"Error in get_exam_results route: {e}")
        return jsonify({'error': 'Server error'}), 500

@teacher_bp.route('/exam/<int:exam_id>/export_submissions', methods=['POST'])
@jwt_required()
def export_submissions(exam_id):
    """ייצוא הגשות להורדה """
    try:
        claims = get_jwt()
        teacher_id, teacher_email = validate_teacher_access(claims)

        # ייצוא ומחיקה
        result = export_submissions_service(exam_id, teacher_id)

        if result['success']:
            if result.get('file_path'):
                file_path = result['file_path']

                # מחק את הקובץ אחרי שה-response מסתיים
                @after_this_request
                def cleanup_file(response):
                    try:
                        cleanup_export_file(file_path)
                        logger.info(f"Cleaned up temp file: {file_path}")
                    except Exception as e:
                        logger.error(f"Failed to cleanup: {e}")
                    return response

                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=result['file_name'],
                    mimetype='text/csv'
                )
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error in export_and_delete_submissions route: {e}")
        return jsonify({'error': 'Server error'}), 500