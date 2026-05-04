import React from 'react';
import './QuestionReviewItem.css';

interface QuestionReviewItemProps {
  question: {
    id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'open_text' | 'code';
    points: number;
    correct_answer: string;
    options?: Array<{
      option_letter: string;
      option_text: string;
      is_correct: boolean;
    }>;
  };
  studentAnswer: {
    question_id: number;
    selected_option?: string;
    open_answer?: string;
    code_answer?: string;
    points_awarded: number;
    max_points: number;
    is_correct: boolean;
    question_type: string;
  };
  aiExplanation?: string;
  questionNumber: number;
  showScores: boolean;
}

const QuestionReviewItem: React.FC<QuestionReviewItemProps> = ({
  question,
  studentAnswer,
  aiExplanation,
  questionNumber,
  showScores
}) => {
  
  const renderMultipleChoiceReview = () => {
    return (
      <div className="multiple-choice-review">
        <div className="options-container">
          {question.options?.map((option) => {
            const isStudentChoice = studentAnswer.selected_option === option.option_letter;
            const isCorrectAnswer = option.is_correct;
            
            let optionClass = 'option-item';
            if (isStudentChoice && isCorrectAnswer) {
              optionClass += ' student-correct';
            } else if (isStudentChoice && !isCorrectAnswer) {
              optionClass += ' student-incorrect';
            } else if (!isStudentChoice && isCorrectAnswer) {
              optionClass += ' correct-answer';
            }

            return (
              <div key={option.option_letter} className={optionClass}>
                <div className="option-header">
                  <span className="option-letter">{option.option_letter}</span>
                  <div className="option-indicators">
                    {isStudentChoice && (
                      <span className="student-indicator">
                        {isCorrectAnswer ? '✓ הבחירה שלך' : '✗ הבחירה שלך'}
                      </span>
                    )}
                    {isCorrectAnswer && (
                      <span className="correct-indicator">
                        ✓ תשובה נכונה
                      </span>
                    )}
                  </div>
                </div>
                <p className="option-text">{option.option_text}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOpenTextReview = () => {
    return (
      <div className="open-text-review">
        <div className="student-answer-section">
          <h4>התשובה שלך:</h4>
          <div className={`answer-display ${studentAnswer.is_correct ? 'correct' : 'incorrect'}`}>
            <p>{studentAnswer.open_answer || 'לא נענתה'}</p>
          </div>
        </div>
        
        {!studentAnswer.is_correct && (
          <div className="correct-answer-section">
            <h4>תשובה מוצעת:</h4>
            <div className="correct-answer-display">
              <p>{question.correct_answer}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCodeReview = () => {
    return (
      <div className="code-review">
        <div className="student-code-section">
          <h4>הקוד שלך:</h4>
          <div className={`code-display ${studentAnswer.is_correct ? 'correct' : 'incorrect'}`}>
            <pre><code>{studentAnswer.code_answer || '// לא נכתב קוד'}</code></pre>
          </div>
        </div>
        
        {!studentAnswer.is_correct && question.correct_answer && (
          <div className="correct-code-section">
            <h4>פתרון מוצע:</h4>
            <div className="correct-code-display">
              <pre><code>{question.correct_answer}</code></pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQuestionContent = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return renderMultipleChoiceReview();
      case 'open_text':
        return renderOpenTextReview();
      case 'code':
        return renderCodeReview();
      default:
        return <div>סוג שאלה לא נתמך</div>;
    }
  };

  return (
    <div className={`question-review-item ${studentAnswer.is_correct ? 'correct-question' : 'incorrect-question'}`}>
      {/* Header */}
      <div className="question-header">
        <div className="question-info">
          <h3 className="question-title">
            שאלה {questionNumber}
            <span className={`status-indicator ${studentAnswer.is_correct ? 'correct' : 'incorrect'}`}>
              {studentAnswer.is_correct ? '✓ נכון' : '✗ שגוי'}
            </span>
          </h3>
          
          {showScores && (
            <div className="score-display">
              <span className="points-awarded">{studentAnswer.points_awarded}</span>
              <span className="points-separator">/</span>
              <span className="max-points">{studentAnswer.max_points}</span>
              <span className="points-label">נקודות</span>
            </div>
          )}
        </div>
        
        <div className="question-type-badge">
          {question.question_type === 'multiple_choice' && '🔘 אמריקאית'}
          {question.question_type === 'open_text' && '✍️ פתוחה'}
          {question.question_type === 'code' && '💻 קוד'}
        </div>
      </div>

      {/* Question Text */}
      <div className="question-text">
        <h4>השאלה:</h4>
        <p>{question.question_text}</p>
      </div>

      {/* Question Content */}
      <div className="question-content">
        {renderQuestionContent()}
      </div>

      {/* AI Explanation */}
      {aiExplanation && !studentAnswer.is_correct && (
        <div className="ai-explanation">
          <div className="explanation-header">
            <span className="ai-icon">🤖</span>
            <h4>הסבר והנחיה</h4>
          </div>
          <div className="explanation-content">
            <p>{aiExplanation}</p>
          </div>
        </div>
      )}

      {/* Success Message for Correct Answers */}
      {studentAnswer.is_correct && (
        <div className="success-message">
          <div className="success-header">
            <span className="success-icon">🎉</span>
            <h4>כל הכבוד!</h4>
          </div>
          <p>ענית נכון על השאלה הזו. המשך כך!</p>
        </div>
      )}
    </div>
  );
};

export default QuestionReviewItem;