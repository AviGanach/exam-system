import logging
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.db import db_cursor
from app.routes.admin import admin_bp
from app.routes.auth import auth_bp
from app.routes.student import student_bp
from app.routes.teacher import teacher_bp


load_dotenv()
app = Flask(__name__)
# הגדרות CORS
CORS(app, origins='*')

# הגדרות JWT
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # נגדיר בכל token בנפרד
app.config['JWT_ALGORITHM'] = 'HS256'
app.config['JWT_DECODE_LEEWAY'] = 10  # סובלנות של 10 שניות לטוקנים

# אתחול JWT
jwt = JWTManager(app)

# רישום Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(teacher_bp)
app.register_blueprint(student_bp)

# הגדרות Logging
if not app.debug:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
    )


# טיפול בשגיאות גלובלי
@app.errorhandler(404)
def not_found(error):
    """טיפול בנתיבים לא קיימים"""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """טיפול בשגיאות שרת פנימיות"""
    app.logger.error(f'Internal server error: {error}')
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(400)
def bad_request(error):
    """טיפול בבקשות שגויות"""
    return jsonify({'error': 'Bad request'}), 400


@app.errorhandler(401)
def unauthorized(error):
    """טיפול בשגיאות אימות"""
    return jsonify({'error': 'Unauthorized'}), 401


@app.errorhandler(403)
def forbidden(error):
    """טיפול בשגיאות הרשאות"""
    return jsonify({'error': 'Forbidden'}), 403


# טיפול בשגיאות JWT
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """טיפול בטוקן שפג תוקף"""
    return jsonify({'error': 'Token has expired'}), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    """טיפול בטוקן לא תקין"""
    return jsonify({'error': 'Invalid token'}), 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    """טיפול בטוקן חסר"""
    return jsonify({'error': 'Token is required'}), 401


def check_database_connection():
    """בדיקת חיבור למסד הנתונים בהתחלה"""
    try:
        with db_cursor() as (conn, cursor):
            cursor.execute("SELECT 1")
            print("✅ Database connection successful")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


# נתיבים בסיסיים
@app.route('/')
def hello():
    """נתיב בסיסי לבדיקת תקינות השרת"""
    return {
        'message': 'Exam System Server Running!',
        'version': '1.0.0',
        'status': 'healthy'
    }


@app.route('/health')
def health_check():
    """בדיקת תקינות מתקדמת"""
    try:
        # בדיקת חיבור DB
        with db_cursor() as (conn, cursor):
            cursor.execute("SELECT 1")

        return {
            'status': 'healthy',
            'database': 'connected',
            'jwt': 'configured'
        }, 200
    except Exception as e:
        return {
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }, 503


if __name__ == '__main__':
    # בדיקת חיבור למסד הנתונים לפני הפעלה
    if not check_database_connection():
        print("Cannot start server - database connection failed")
        exit(1)

    # הגדרות הפעלה
    debug_mode = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    port = int(os.getenv('FLASK_PORT', 5002))
    host = os.getenv('FLASK_HOST', '127.0.0.1')

    print(f"🚀 Starting server on {host}:{port} (debug={debug_mode})")
    app.run(debug=debug_mode, host=host, port=port)