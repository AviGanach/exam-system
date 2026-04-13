import logging
import os
import resend
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

resend.api_key = os.getenv('RESEND_API_KEY')


class EmailService:
    def __init__(self):
        self.sender_email = "onboarding@resend.dev"  # דומיין ברירת מחדל של Resend

    def _send_email(self, to_email, subject, html_content, text_content=None):
        """שולח מייל גנרי"""
        if not to_email or not subject or not html_content:
            return {'success': False, 'error': 'Missing required fields'}

        try:
            params = {
                "from": self.sender_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if text_content:
                params["text"] = text_content

            response = resend.Emails.send(params)
            logger.info(f"מייל נשלח בהצלחה: {response}")
            return {'success': True, 'message': 'Email sent successfully'}

        except Exception as e:
            logger.error(f"שגיאה בשליחת מייל: {e}")
            return {'success': False, 'error': str(e)}

    def send_admin_verification_code(self, admin_email, verification_code):
        """שולח קוד אימות דו-שלבי לאדמין"""
        subject = "קוד אימות - מערכת בחינות"

        html_content = f"""
        <html dir="rtl">
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <div style="max-width: 400px; margin: 0 auto; border: 2px solid #007bff; border-radius: 10px; padding: 30px;">
                    <h2 style="color: #007bff;">🔐 קוד אימות</h2>
                    <p>שלום אדמין,</p>
                    <p>הקוד שלך לכניסה למערכת:</p>
                    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">
                            {verification_code}
                        </span>
                    </div>
                    <p style="color: #6c757d; font-size: 14px;">
                        הקוד תקף ל-10 דקות בלבד
                    </p>
                </div>
            </body>
        </html>
        """

        text_content = f"""
        קוד אימות - מערכת בחינות

        שלום אדמין,
        הקוד שלך לכניסה למערכת: {verification_code}

        הקוד תקף ל-10 דקות בלבד.
        """

        return self._send_email(admin_email, subject, html_content, text_content)