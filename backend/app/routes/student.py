import logging
import os
import requests

from dotenv import load_dotenv
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt

from app.services.exam import get_exam_info_service, get_exam_service, submit_exam_service
from app.services.student import register_student_for_exam, get_exam_review_service

logger = logging.getLogger(__name__)

load_dotenv()

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


@student_bp.route('/register/<exam_code>', methods=['POST'])
def register(exam_code: str) -> tuple[Response, int]:
    """רישום תלמיד למבחן"""
    try:
        print("Register", exam_code)
        data = request.get_json()

        # ולידציה של נתונים
        name = data.get('name')
        id_number = data.get('id_number')
        email = data.get('email')
        print("Register", name, id_number, email)
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

@student_bp.route('/exam_info/<exam_code>', methods=['GET'])
def get_exam_info(exam_code: str) -> tuple[Response, int]:
    """מחזיר מידע על מבחן לפני רישום התלמיד"""
    try:
        if not exam_code:
            return jsonify({'error': 'Exam code is required'}), 400
        print("CHECK Get exam info", exam_code)
        # קריאה לservice
        result = get_exam_info_service(exam_code)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404

    except Exception as e:
        logger.error(f"Error in get_exam_info route: {e}")
        return jsonify({'error': 'Server error'}), 500

@student_bp.route('/exam_start/<exam_code>', methods=['GET'])
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
        result = get_exam_service(student_id, exam_id)
        print(result)
        if result['success']:
            return jsonify(result), 201
        else:
            status_code = 404 if 'not found' in result.get('message', '') else 400
            return jsonify(result), status_code

    except Exception as e:
        logger.error(f"Error in get_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500

@student_bp.route('/run_code', methods=['POST'])
def run_code():
    """מריץ קוד תלמיד בזמן מבחן דרך Judge0"""
    try:
        data = request.get_json()
        source_code = data.get('source_code')
        language_id = data.get('language_id')
        print(source_code, language_id)
        if not source_code or not language_id:
            return jsonify({'error': 'חסר קוד או שפה'}), 400

        headers = {
            "content-type": "application/json",
            "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
            "x-rapidapi-key": os.getenv("JUDGE0_KEY"),
        }

        payload = {
            "source_code": source_code,
            "language_id": language_id,
            "wait": True
        }

        judge0_response = requests.post(
            'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
            headers=headers,
            json=payload
        )

        return jsonify(judge0_response.json()), judge0_response.status_code

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@student_bp.route('/submit_exam', methods=['POST'])
@jwt_required()
def submit_exam():
    """קבלת תשובות תלמיד ושמירתן בבסיס הנתונים"""
    try:
        # שליפת פרטי התלמיד מה־JWT
        claims = get_jwt()
        student_id = claims.get('student_id')
        exam_id = claims.get('exam_id')
        print("exam_id",exam_id)

        if not student_id or not exam_id:
            return jsonify({'error': 'Invalid token'}), 401

        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # קריאה לשכבת השירות
        result = submit_exam_service(exam_id, data)

        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400

    except Exception as e:
        logger.error(f"Error in submit_exam route: {e}")
        return jsonify({'error': 'Server error'}), 500



@student_bp.route('/exam/<submission_id>/review', methods=['GET'])
@jwt_required()
def get_exam_review(submission_id):  # זה יגיע כstring
    try:
        claims = get_jwt()
        student_id = claims.get('student_id')
        exam_id = claims.get('exam_id')

        if not student_id:
            return jsonify({'error': 'Invalid token'}), 401

        # המרה לint בתוך הפונקציה
        try:
            submission_id = int(submission_id)
        except ValueError:
            return jsonify({'error': 'Invalid submission ID'}), 400

        review_data = get_exam_review_service(student_id, exam_id, submission_id)

        if review_data['success']:
            return jsonify(review_data['data']), 200
        else:
            # החזרת הודעות שגיאה ברורות
            status_code = 403 if 'not available' in review_data['message'] else 400
            return jsonify({'error': review_data['message']}), status_code

    except Exception as e:
        logger.error(f"Error in get_exam_review route: {e}")
        return jsonify({'error': 'Server error'}), 500