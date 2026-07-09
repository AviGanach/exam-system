import secrets
import string
import os
import logging
import re
import time

from google import genai
from google.genai import types
# from openai import OpenAI # אופציה למעבר ל-DEEPSEEK אם נרצה להשתמש בו במקום GEMINI

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# טעינת משתני סביבה
load_dotenv()

# הגדרת Google Gemini API
gemini_api_key = os.getenv('GEMINI_API_KEY')
# הגדרות DEEPSEEK
# deepseek_api_key = os.getenv('DEEPSEEK_API_KEY')

# GEMINI
if gemini_api_key:
    client = genai.Client(api_key=gemini_api_key)
else:
    client = None

# DEEPEEK
# if deepseek_api_key:
#     client = OpenAI(
#         api_key=deepseek_api_key,
#         base_url="https://api.deepseek.com"
#     )
# else:
#     client = None

def generate_verification_code():
    """יוצר קוד אימות 4 ספרות"""
    return ''.join(secrets.choice(string.digits) for _ in range(4))

def _get_ai_grading(prompt: str, max_points: int, max_tokens: int) -> tuple[int, str]:
    """פונקציה פנימית לניהול התקשורת מול ה-AI וחילוץ הנתונים"""
    max_retries = 3

    for attempt in range(max_retries):
        try:
            # GEMINI
            if not client or not gemini_api_key:
                return max_points // 2, "API not configured"
         
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.2,
                )
            )

            if not response.candidates or not response.candidates[0].content.parts:
                return max_points // 2, "Empty response from AI"

            # DEEPSEEK
            # if not client or not deepseek_api_key:
            #     return max_points // 2, "API not configured"
            #
            # response = client.chat.completions.create(
            #     model="deepseek-chat",
            #     messages=[
            #         {"role": "user", "content": prompt}
            #     ],
            #     max_tokens=max_tokens,
            #     temperature=0.2,
            # )


            response_text = (response.text or "").strip()

            if not response_text:
                return max_points // 2, "Empty response from AI"

            # חילוץ ציון בעזרת Regex
            score = 0
            score_match = re.search(r'SCORE:\s*(\d+)', response_text, re.IGNORECASE)
            if score_match:
                score = int(score_match.group(1))

            # חילוץ הסבר בעזרת Regex
            explanation = "לא ניתן לפרסר הסבר"
            explanation_match = re.search(r'EXPLANATION:\s*(.*)', response_text, re.IGNORECASE | re.DOTALL)
            if explanation_match:
                explanation = explanation_match.group(1).strip().replace('**', '')

            score = max(0, min(score, max_points))
            return score, explanation

        except Exception as e:
            if '429' in str(e):
                wait_time = 10 * (attempt + 1)  # 10, 20, 30 שניות
                logger.warning(f"Rate limit hit, waiting {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)
            else:
                logger.error(f"AI Communication Error: {e}")
                return max_points // 2, f"Error: {str(e)}"

    # אם נכשל אחרי כל הניסיונות
    logger.error("Max retries reached after rate limit errors")
    return max_points // 2, "שירות AI עמוס, נסה שוב מאוחר יותר"

def grade_open_text_question_with_ai(question_text: str, correct_answer: str,
                                     student_answer: str, max_points: int) -> tuple[int, str]:
    """בדיקת שאלה פתוחה עם פורמט מלא"""
    try:
        if not student_answer or not student_answer.strip():
            return 0, ""

        max_points_int = int(max_points)
        prompt = f"""
        You are an expert exam evaluator. Check the following open-ended answer.
        Question: {question_text}
        Expected answer: {correct_answer}
        Student's answer: {student_answer}
        The student's answer may be written in any language, unless otherwise specified in "Expected answer".
        Strict response format instructions (mandatory):
        SCORE: [number between 0 and {max_points_int}]
        EXPLANATION: [brief explanation of up to 2 sentences]
        """

        score, explanation = _get_ai_grading(prompt, max_points_int, max_tokens=1000)

        print(
            f"--- OPEN TEXT GRADING ---\nScore: {score}/{max_points_int}\nExplanation: {explanation}\n--------------------------")
        return score, explanation
    except Exception as e:
        logger.error(f"Error in open text grading: {e}")
        return int(max_points) // 2, "Error in open text grading"


def grade_code_question_with_ai(question_text: str, expected_description: str,
                                code_answer: str, max_points: int, programming_language: str) -> tuple[int, str]:
    """בדיקת שאלת קוד עם פורמט מלא"""
    try:
        if not code_answer or not code_answer.strip():
            return 0, ""

        max_points_int = int(max_points)
        prompt = f"""
        You are an expert programming examiner. Check the following code.

        Question: {question_text}
        Expected solution description: {expected_description}
        Programming language: {programming_language}
        Student's code:
        ```{programming_language}
        {code_answer}
        ```
        Criteria: Problem solving (50%), syntax and logic (30%), code cleanliness (20%).

        Strict response format instructions (mandatory):
        SCORE: [number between 0 and {max_points_int}]
        EXPLANATION: [detailed explanation of up to 4-5 sentences]
        """

        score, explanation = _get_ai_grading(prompt, max_points_int, max_tokens=3000)

        print(
            f"--- CODE GRADING ---\nScore: {score}/{max_points_int}\nExplanation: {explanation}\n--------------------")
        return score, explanation

    except Exception as e:
        logger.error(f"Error in code grading: {e}")
        return int(max_points) // 2, "Error in code grading"