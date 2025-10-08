import logging
import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.sender_email = os.getenv('EMAIL_SENDER')
        self.sender_password = os.getenv('EMAIL_PASSWORD')

    def _send_email(self, to_email, subject, html_content, text_content=None):
        """שולח מייל גנרי"""
        if not to_email or not subject or not html_content:
            return {'success': False, 'error': 'Missing required fields'}

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.sender_email
            message["To"] = to_email


            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                message.attach(text_part)

            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)

            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, to_email, message.as_string())

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

# Singleton instance
email_service = EmailService()