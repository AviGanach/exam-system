import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionsList from '../../components/QuestionsList';
import './EditExamContent.css';

interface User {
    token: string;
    role: string;
    email: string;
    teacher_id?: number;
}

interface EditExamContentProps {
    user: User;
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
    correct_output?: string;
}

const EditExamContent = ({ user }: EditExamContentProps) => {
    const navigate = useNavigate();
    const { examId } = useParams<{ examId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [examCode, setExamCode] = useState('');
    const [examTitle, setExamTitle] = useState('');

    const [questions, setQuestions] = useState<Question[]>([]);
    const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);

    useEffect(() => {
        fetchExamContent();
    }, [examId]);

    const fetchExamContent = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/teacher/exam/${examId}/view`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const exam = data.exam;
                    
                    setExamTitle(exam.title);
                    setExamCode(exam.exam_code);

                    // המרת שאלות לפורמט עריכה
                    const convertedQuestions = exam.questions.map((q: any) => ({
                        id: `q_${q.id}`,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        correct_answer: q.correct_answer,
                        points: q.points,
                        programming_language: q.programming_language,
                        initial_code: q.initial_code,
                        options: q.options ? q.options.map((opt: any) => ({
                            letter: opt.option_letter,
                            text: opt.option_text,
                            is_correct: opt.is_correct
                        })) : []
                    }));
                    
                    setQuestions(convertedQuestions);
                    setOriginalQuestions(JSON.parse(JSON.stringify(convertedQuestions)));
                } else {
                    setError(data.error || 'שגיאה בטעינת המבחן');
                }
            } else {
                if (response.status === 409) {
                    // מבחן עם הגשות
                    const data = await response.json();
                    alert('לא ניתן לערוך תוכן מבחן שיש לו הגשות');
                    navigate(`/teacher/exam/${examId}/view`);
                    return;
                }
                setError('שגיאה בטעינת המבחן');
            }
        } catch (err) {
            setError('שגיאה בחיבור לשרת');
        } finally {
            setIsLoading(false);
        }
    };

    const hasUnsavedChanges = () => {
        return JSON.stringify(questions) !== JSON.stringify(originalQuestions);
    };

    const handleCancel = () => {
        if (hasUnsavedChanges()) {
            if (!window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?')) {
                return;
            }
        }
        navigate(`/teacher/exam/${examId}/view`);
    };

    const validateQuestions = () => {
        if (questions.length === 0) {
            alert('יש להוסיף לפחות שאלה אחת');
            return false;
        }

        const invalidQuestions = questions.filter(q => !q.question_text.trim() || !q.correct_answer);
        if (invalidQuestions.length > 0) {
            alert('יש שאלות ללא טקסט או תשובה נכונה');
            return false;
        }

        // ולידציה לשאלות אמריקאיות
        const multipleChoiceQuestions = questions.filter(q => q.question_type === 'multiple_choice');
        const invalidMCQuestions = multipleChoiceQuestions.filter(q =>
            !q.options ||
            q.options.length < 2 ||
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
            !q.programming_language || !q.correct_answer
        );

        if (invalidCodeQuestions.length > 0) {
            alert('יש שאלות קוד חסרות שפת תכנות או תיאור לתשובה נכונה');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateQuestions()) return;

        setIsSaving(true);
        try {
            const dataToSend = {
                questions: questions
            };

            const response = await fetch(`/api/teacher/exam/${examId}/update_content`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    alert('תוכן המבחן עודכן בהצלחה');
                    navigate(`/teacher/exam/${examId}/view`);
                } else {
                    if (result.has_submissions) {
                        alert('לא ניתן לערוך מבחן שיש לו הגשות. אנא מחק את ההגשות תחילה.');
                    } else {
                        alert(result.error || 'שגיאה בעדכון תוכן המבחן');
                    }
                }
            } else {
                if (response.status === 409) {
                    alert('לא ניתן לערוך מבחן שיש לו הגשות');
                } else {
                    alert('שגיאה בחיבור לשרת');
                }
            }
        } catch (error) {
            alert('שגיאה בעדכון תוכן המבחן');
        } finally {
            setIsSaving(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `q_new_${Date.now()}`,
            question_text: '',
            question_type: 'multiple_choice',
            points: 10,
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
        return questions.reduce((sum, q) => sum + Number(q.points), 0);
    };

    if (isLoading) {
        return (
            <div className="update-content-page">
                <div className="update-content-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">טוען תוכן מבחן...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="update-content-page">
                <div className="update-content-container">
                    <div className="error-container">
                        <div className="error-message">{error}</div>
                        <button onClick={handleCancel} className="btn btn-cancel">
                            חזור
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="update-content-page">
            <div className="update-content-container">
                <header className="update-content-header">
                    <div className="header-content">
                        <div>
                            <h1 className="page-title">עדכון תוכן מבחן</h1>
                            <div className="exam-info">
                                <span className="exam-title">{examTitle}</span>
                                <span className="exam-code-display">{examCode}</span>
                            </div>
                        </div>
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
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'שומר...' : 'שמור שינויים'}
                            </button>
                        </div>
                    </div>
                </header>

                {hasUnsavedChanges() && (
                    <div className="changes-notice">
                        <span className="changes-notice-icon">⚠️</span>
                        יש לך שינויים שטרם נשמרו
                    </div>
                )}

                <div className="update-content-main">
                    <div className="content-header">
                        <h2 className="content-title">שאלות המבחן</h2>
                        <div className="content-stats">
                            <span className="stat">
                                <strong>{questions.length}</strong> שאלות
                            </span>
                            <span className="stat">
                                <strong>{getTotalPoints()}</strong> נקודות
                            </span>
                        </div>
                    </div>

                    <QuestionsList
                        questions={questions}
                        onAddQuestion={addQuestion}
                        onUpdateQuestion={updateQuestion}
                        onDeleteQuestion={deleteQuestion}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditExamContent;