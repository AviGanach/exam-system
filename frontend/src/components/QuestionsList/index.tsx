import { useState } from 'react';
import './QuestionsList.css';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'open_text' | 'code';
  points: number;
  options?: { letter: string; text: string; is_correct: boolean }[];
  
  // שדות לשאלות קוד
  programming_language?: string;
  initial_code?: string;
  expected_output?: string;
}

interface QuestionsListProps {
  questions: Question[];
  onAddQuestion: () => void;
  onUpdateQuestion: (questionId: string, updatedQuestion: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
}

const QuestionsList = ({ questions, onAddQuestion, onUpdateQuestion, onDeleteQuestion }: QuestionsListProps) => {
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);
  
  // State for code editor preferences
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLTR, setIsLTR] = useState(true);

  const questionTypes = [
    { value: 'multiple_choice', label: 'אמריקאית' },
    { value: 'open_text', label: 'פתוחה' },
    { value: 'code', label: 'שאלת קוד' }
  ];

  const programmingLanguages = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' }
  ];

  const startEditing = (question: Question) => {
    setEditingQuestion(question.id);
    setEditForm({ ...question });
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
    setEditForm(null);
  };

  const saveQuestion = () => {
    if (editForm && editingQuestion) {
      if (!editForm.question_text.trim()) {
        alert('יש להזין טקסט שאלה');
        return;
      }

      if (editForm.question_type === 'multiple_choice') {
        const hasCorrectAnswer = editForm.options?.some(opt => opt.is_correct);
        const hasEmptyOptions = editForm.options?.some(opt => !opt.text.trim());
        
        if (!hasCorrectAnswer) {
          alert('יש לבחור תשובה נכונה');
          return;
        }
        
        if (hasEmptyOptions) {
          alert('יש למלא את כל האפשרויות');
          return;
        }
      }

      onUpdateQuestion(editingQuestion, editForm);
      cancelEditing();
    }
  };

  const updateEditForm = (field: keyof Question, value: any) => {
    if (!editForm) return;
    
    const updated = { ...editForm, [field]: value };
    
    // אם שינו את סוג השאלה, צריך להתאים את האפשרויות
    if (field === 'question_type') {
      if (value === 'multiple_choice') {
        updated.options = [
          { letter: 'A', text: '', is_correct: false },
          { letter: 'B', text: '', is_correct: false },
          { letter: 'C', text: '', is_correct: false },
          { letter: 'D', text: '', is_correct: false }
        ];
        // נקה שדות קוד
        updated.programming_language = undefined;
        updated.initial_code = undefined;
        updated.expected_output = undefined;
      } else if (value === 'code') {
        // נקה אפשרויות אמריקאיות והגדר ברירות מחדל לקוד
        updated.options = undefined;
        updated.programming_language = 'python';
        updated.initial_code = '';
        updated.expected_output = '';
      } else {
        // open_text - נקה הכל
        updated.options = undefined;
        updated.programming_language = undefined;
        updated.initial_code = undefined;
        updated.expected_output = undefined;
      }
    }
    
    setEditForm(updated);
  };

  const updateOption = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    if (!editForm?.options) return;
    
    const updatedOptions = editForm.options.map((opt, i) => {
      if (i === index) {
        if (field === 'is_correct' && value === true) {
          return { ...opt, is_correct: true };
        } else if (field === 'is_correct' && value === false) {
          return { ...opt, is_correct: false };
        } else if (field === 'text') {
          return { ...opt, text: value as string };
        }
      } else if (field === 'is_correct' && value === true) {
        // רק תשובה אחת יכולה להיות נכונה
        return { ...opt, is_correct: false };
      }
      return opt;
    });
    
    setEditForm({ ...editForm, options: updatedOptions });
  };

  const getQuestionTypeText = (type: string) => {
    const typeMap = {
      'multiple_choice': 'אמריקאית',
      'open_text': 'פתוחה', 
      'code': 'שאלת קוד'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  const renderQuestionItem = (question: Question, index: number) => {
    if (editingQuestion === question.id) {
      return (
        <div key={question.id} className="question-form">
          <div className="form-group">
            <label className="form-label">טקסט השאלה</label>
            <textarea
              className="form-input form-textarea"
              value={editForm?.question_text || ''}
              onChange={(e) => updateEditForm('question_text', e.target.value)}
              placeholder="הזן את השאלה"
            />
          </div>

          <div className="form-group">
            <div className="form-grid-2">
              <div>
                <label className="form-label">סוג שאלה</label>
                <select
                  className="form-select"
                  value={editForm?.question_type || 'multiple_choice'}
                  onChange={(e) => updateEditForm('question_type', e.target.value)}
                >
                  {questionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">ניקוד</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm?.points || 1}
                  onChange={(e) => updateEditForm('points', parseInt(e.target.value) || 1)}
                  min="1"
                />
              </div>
            </div>
          </div>

          {editForm?.question_type === 'multiple_choice' && (
            <div className="options-section">
              <label className="form-label">אפשרויות (בחר את התשובה הנכונה)</label>
              {editForm.options?.map((option, index) => (
                <div key={option.letter} className="option-input-group">
                  <input
                    type="radio"
                    name="correct_answer"
                    className="option-radio"
                    checked={option.is_correct}
                    onChange={() => updateOption(index, 'is_correct', true)}
                  />
                  <span className="option-letter">{option.letter}.</span>
                  <input
                    type="text"
                    className="option-input"
                    value={option.text}
                    onChange={(e) => updateOption(index, 'text', e.target.value)}
                    placeholder={`אפשרות ${option.letter}`}
                  />
                </div>
              ))}
            </div>
          )}

          {editForm?.question_type === 'code' && (
            <div className="code-section">
              <div className="form-group">
                <label className="form-label">שפת תכנות</label>
                <select
                  className="form-select"
                  value={editForm?.programming_language || 'python'}
                  onChange={(e) => updateEditForm('programming_language', e.target.value)}
                >
                  {programmingLanguages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">קוד התחלתי (אופציונלי)</label>
                <div className="code-editor-wrapper">
                  <div className="code-editor-controls">
                    <button
                      type="button"
                      className={`code-control-btn ${isDarkMode ? 'active' : ''}`}
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      {isDarkMode ? 'בהיר' : 'כהה'}
                    </button>
                    <button
                      type="button"
                      className={`code-control-btn ${isLTR ? 'active' : ''}`}
                      onClick={() => setIsLTR(!isLTR)}
                    >
                      {isLTR ? 'LTR' : 'RTL'}
                    </button>
                  </div>
                  <textarea
                    className={`form-input code-textarea ${isDarkMode ? 'dark' : ''} ${isLTR ? 'ltr' : ''}`}
                    value={editForm?.initial_code || ''}
                    onChange={(e) => updateEditForm('initial_code', e.target.value)}
                    placeholder="הזן קוד התחלתי שהתלמיד יקבל..."
                    rows={8}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">פלט צפוי</label>
                <textarea
                  className="form-input"
                  value={editForm?.expected_output || ''}
                  onChange={(e) => updateEditForm('expected_output', e.target.value)}
                  placeholder="True\nFalse\nTrue"
                  rows={4}
                />
                <div className="expected-output-help">
                  <div className="help-title">דוגמאות לפלט צפוי:</div>
                  <div className="help-examples">
                    <strong>פונקציה שבודקת ראשוניות:</strong><br/>
                    is_prime(7) → True<br/>
                    is_prime(10) → False<br/><br/>
                    
                    <strong>פונקציה שמחזירה רשימה:</strong><br/>
                    [1, 2, 3, 4, 5]<br/><br/>
                    
                    <strong>מספר פלטים:</strong><br/>
                    True<br/>
                    False<br/>
                    True
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-save" onClick={saveQuestion}>
              שמור
            </button>
            <button className="btn-cancel" onClick={cancelEditing}>
              ביטול
            </button>
          </div>
        </div>
      );
    }

    return (
      <div key={question.id} className="question-item">
        <div className="question-header">
          <div className="question-title-section">
            <span className="question-number">שאלה {index + 1}</span>
            <div className="question-text">{question.question_text}</div>
          </div>
          <div className="question-actions">
            <button
              className="btn-small btn-edit"
              onClick={() => startEditing(question)}
            >
              עריכה
            </button>
            <button
              className="btn-small btn-delete"
              onClick={() => onDeleteQuestion(question.id)}
            >
              מחיקה
            </button>
          </div>
        </div>

        <div className="question-details">
          <div className="question-detail-item">
            <span>סוג: {getQuestionTypeText(question.question_type)}</span>
          </div>
          <div className="question-detail-item">
            <span>ניקוד: {question.points}</span>
          </div>
          {question.question_type === 'code' && question.programming_language && (
            <div className="question-detail-item">
              <span>שפה: {programmingLanguages.find(lang => lang.value === question.programming_language)?.label}</span>
            </div>
          )}
        </div>

        {question.question_type === 'multiple_choice' && question.options && (
          <div className="question-options">
            {question.options.map((option) => (
              <div
                key={option.letter}
                className={`option-item ${option.is_correct ? 'option-correct' : ''}`}
              >
                {option.letter}. {option.text}
                {option.is_correct && ' ✓'}
              </div>
            ))}
          </div>
        )}

        {question.question_type === 'code' && (
          <div className="code-preview">
            {question.initial_code && (
              <div className="code-block">
                <div className="code-label">קוד התחלתי:</div>
                <pre className="code-content">{question.initial_code}</pre>
              </div>
            )}
            {question.expected_output && (
              <div className="code-block">
                <div className="code-label">פלט צפוי:</div>
                <pre className="code-content">{question.expected_output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="questions-section">
      <h2 className="section-title">שאלות המבחן</h2>
      
      <div className="questions-list">
        {questions.length === 0 ? (
          <div className="empty-questions">
            <div className="empty-questions-icon">❓</div>
            <div className="empty-questions-text">עדיין לא הוספת שאלות למבחן</div>
            <div className="empty-questions-subtext">לחץ על הכפתור למטה כדי להוסיף שאלה ראשונה</div>
          </div>
        ) : (
          questions.map((question, index) => renderQuestionItem(question, index))
        )}
      </div>

      <div className="add-question-section">
        <button className="add-question-btn" onClick={onAddQuestion}>
          + הוסף שאלה חדשה
        </button>
      </div>
    </div>
  );
};

export default QuestionsList;