import csv
import logging
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List


logger = logging.getLogger(__name__)

def create_submissions_export_file(submissions_data: Dict[str, Any], exam_id: int) -> Dict[str, Any]:
    try:
        exam_title = submissions_data['exam_title']
        submissions = submissions_data['submissions']
        temp_dir = Path(tempfile.gettempdir())
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f"exam_{exam_id}_submissions_{timestamp}.csv"
        file_path = temp_dir / file_name

        with file_path.open('w', newline='', encoding='utf-8-sig') as csvfile:
            writer = csv.writer(csvfile)

            # כותרות מלאות
            headers = [
                'ת"ז תלמיד', 'שם תלמיד', 'מייל תלמיד',
                'זמן התחלה', 'זמן סיום', 'סטטוס הגשה', 'מעברי חלונות',  # הוספתי פסיק
                'מספר שאלה', 'טקסט השאלה', 'סוג השאלה', 'שפת תכנות', 'תשובה נכונה',
                'תשובת תלמיד', 'ציון שאלה', 'נקודות שאלה', 'ציון סופי', 'נקודות מקסימליות', 'ציון עובר', 'האם עבר'
            ]
            writer.writerow(headers)

            # נתונים - העברתי את הלוגיקה לכאן
            for submission in submissions:
                passed = 'כן' if submission['total_score'] >= submission.get('passing_grade', 60) else 'לא'
                for answer in submission['answers']:
                    writer.writerow([
                        submission['student_id'],  # 'מזהה תלמיד'
                        submission['student_name'],  # 'שם תלמיד'
                        submission['student_email'],  # 'מייל תלמיד'
                        submission['start_time'].strftime('%d/%m/%Y %H:%M:%S'),  # 'זמן התחלה'
                        submission['end_time'].strftime('%d/%m/%Y %H:%M:%S'),  # 'זמן סיום'
                        submission['status'],  # 'סטטוס הגשה'
                        submission['window_switches'],  # 'מעברי חלונות'
                        answer['question_order'],  # 'מספר שאלה'
                        answer['question_text'],  # 'טקסט השאלה'
                        answer['question_type'],  # 'סוג השאלה'
                        answer['programming_language'] or '',  # 'שפת תכנות'
                        answer['expected_answer'],  # 'תשובה נכונה'
                        answer['student_answer_display'],  # 'תשובת תלמיד'
                        answer['question_score'],  # 'ציון שאלה'
                        answer['max_question_score'],  # 'נקודות שאלה'
                        submission['total_score'],  # 'ציון סופי'
                        submission['max_score'],  # 'נקודות מקסימליות'
                        submission.get('passing_grade', 60),  # 'ציון עובר'
                        passed,  # 'האם עבר'
                    ])

        return {
            'success': True,
            'file_path': str(file_path),
            'file_name': file_name,
            'exam_title': exam_title,
            'submissions_count': len(submissions)
        }
    except Exception as e:
        logger.error(f"Error creating export file: {e}")
        return {'success': False, 'error': str(e)}

def cleanup_export_file(file_path_str: str):
    """מחיקת קובץ ייצוא זמני"""
    try:
        file_path = Path(file_path_str)
        if file_path.exists():
            file_path.unlink()
            if not file_path.exists():  # ← בדיקה שבאמת נמחק
                logger.info(f"Successfully cleaned up export file: {file_path}")
            else:
                logger.error(f"Failed to delete file (still exists): {file_path}")
        else:
            logger.info(f"File not found for cleanup: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up export file: {e}")