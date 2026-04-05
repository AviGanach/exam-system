import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamDetailsForm from '../../components/ExamDetailsForm';
import QuestionsList from '../../components/QuestionsList';
import ExamSidebar from '../../components/ExamSidebar';
import API_URL from '../../config';
import './CreateExam.css';

interface User {
  token: string;
  role: string;
  email: string;
  teacher_id?: number;
}

interface CreateExamProps {
  user: User;
}

interface ExamDetails {
  title: string;
  description: string;
  duration_minutes: number;
  passing_grade: number;
  start_time: string;
  end_time: string;
  show_timer: boolean;
  show_grade_immediately: boolean;
  track_window_switches: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'open_text' | 'code';
  points: number;
  correct_answer?: string;
  options?: { letter: string; text: string; is_correct: boolean }[];
  programming_language?: string;
  initial_code?: string;
}

const CreateExam = ({ user }: CreateExamProps) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const [examDetails, setExamDetails] = useState<ExamDetails>({
    title: '',
    description: '',
    duration_minutes: 60,
    passing_grade: 60,
    start_time: '',
    end_time: '',
    show_timer: true,
    show_grade_immediately: false,
    track_window_switches: true,
  });

  const [questions, setQuestions] = useState<Question[]>([]);

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?')) {
        navigate('/teacher/dashboard');
      }
    } else {
      navigate('/teacher/dashboard');
    }
  };

  const hasUnsavedChanges = () => {
    return examDetails.title.trim() !== '' || questions.length > 0;
  };

  const validateExam = () => {
    if (!examDetails.title.trim()) {
      alert('יש להזין כותרת למבחן');
      return false;
    }

    if (questions.length === 0) {
      alert('יש להוסיף לפחות שאלה אחת');
      return false;
    }

    const invalidQuestions = questions.filter(q => !q.question_text.trim());
    if (invalidQuestions.length > 0) {
      alert('יש שאלות ללא טקסט');
      return false;
    }

    // ולידציה לשאלות אמריקאיות
    const multipleChoiceQuestions = questions.filter(q => q.question_type === 'multiple_choice');
    const invalidMCQuestions = multipleChoiceQuestions.filter(q =>
      !q.options ||
      q.options.length < 2 ||
      !q.correct_answer ||
      !q.options.some(opt => opt.is_correct) ||
      q.options.some(opt => !opt.text.trim())
    );

    if (invalidMCQuestions.length > 0) {
      alert('יש שאלות אמריקאיות לא תקינות (חסרות אפשרויות או תשובה נכונה)');
      return false;
    }

    // ולידציה לשאלות קוד
    const codeQuestions = questions.filter(q => q.question_type === 'code');
    const invalidCodeQuestions = codeQuestions.filter(q =>
      !q.programming_language
    );

    if (invalidCodeQuestions.length > 0) {
      alert('יש שאלות קוד חסרות שפת תכנות או פלט צפוי');
      return false;
    }

    return true;
  };

  const saveExam = async (status: 'draft' | 'active') => {
    if (!validateExam()) return;

    setIsSaving(true);
    try {
      const examData = {
        ...examDetails,
        questions,
        status
      };

      console.log(examData);
      const response = await fetch(`${API_URL}/api/teacher/create-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },

        body: JSON.stringify(examData)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          navigate('/teacher/dashboard');
        } else {
          alert(result.message || 'שגיאה ביצירת המבחן');
        }
      } else {
        alert('שגיאה בחיבור לשרת');
      }
    } catch (error) {
      alert('שגיאה ביצירת המבחן');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      points: 10,
      correct_answer: '',
      options: [
        { letter: 'A', text: '', is_correct: false },
        { letter: 'B', text: '', is_correct: false },
        { letter: 'C', text: '', is_correct: false },
        { letter: 'D', text: '', is_correct: false }
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, updatedQuestion: Question) => {
    setQuestions(questions.map(q => q.id === questionId ? updatedQuestion : q));
  };

  const deleteQuestion = (questionId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את השאלה?')) {
      setQuestions(questions.filter(q => q.id !== questionId));
    }
  };

  const getTotalPoints = () => {
    return questions.reduce((sum, q) => sum + q.points, 0);
  };

  return (
    <div className="create-exam-page">
      <div className="create-exam-container">
        <header className="create-exam-header">
          <div className="header-content">
            <h1 className="page-title">יצירת מבחן חדש</h1>
            <div className="header-actions">
              <button
                className="btn btn-cancel"
                onClick={handleCancel}
                disabled={isSaving}
              >
                ביטול
              </button>
              <button
                className="btn btn-save"
                onClick={() => saveExam('draft')}
                disabled={isSaving}
              >
                {isSaving ? 'שומר...' : 'שמירה כטיוטה'}
              </button>
              <button
                className="btn btn-publish"
                onClick={() => saveExam('active')}
                disabled={isSaving}
              >
                {isSaving ? 'מפרסם...' : 'פרסום מבחן'}
              </button>
            </div>
          </div>
        </header>

        <div className="create-exam-content">
          <main className="main-content">
            <ExamDetailsForm
              examDetails={examDetails}
              setExamDetails={setExamDetails}
            />

            <QuestionsList
              questions={questions}
              onAddQuestion={addQuestion}
              onUpdateQuestion={updateQuestion}
              onDeleteQuestion={deleteQuestion}
            />
          </main>

          <aside className="sidebar">
            <ExamSidebar
              questionsCount={questions.length}
              totalPoints={getTotalPoints()}
              examDetails={examDetails}
            />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;