import secrets
import string

def generate_verification_code():
    """יוצר קוד אימות 4 ספרות"""
    return ''.join(secrets.choice(string.digits) for _ in range(4))
