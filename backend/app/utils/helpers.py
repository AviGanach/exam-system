import random

def generate_verification_code(length: int = 4) -> str:
    """מייצר קוד אימות בן N ספרות (ברירת מחדל: 4)"""
    return ''.join(random.choices('0123456789', k=length))