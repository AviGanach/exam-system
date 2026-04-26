import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ExamDetailsForm from '../../components/ExamDetailsForm';
import QuestionsList from '../../components/QuestionsList';
import ExamSidebar from '../../components/ExamSidebar';
import API_URL from '../../config';
import './EditExam.css';

interface User {
    token: string;
    role: string;
    email: string;
    teacher_id?: number;
}

interface EditExamProps {
    user: User;
    examId?: string; // יגיע מ-useParams בקובץ האמיתי
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
    show_review_after_exam: boolean;
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
    correct_output?: string;
}

const EditExam = ({ user }: EditExamProps) => {
    const navigate = useNavigate();
    const { examId } = useParams<{ examId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [examCode, setExamCode] = useState('');

    const [examDetails, setExamDetails] = useState<ExamDetails>({
        title: '',
        description: '',
        duration_minutes: 60,
        passing_grade: 60,
        start_time: '',
        end_time: '',
        show_timer: true,
        show_grade_immediately: false,
        show_review_after_exam: false,
        track_window_switches: true,
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    const [originalData, setOriginalData] = useState<any>(null);

    useEffect(() => {
        fetchExam();
    }, [examId]);

    // פונקציות עזר לטיפול בתאריכים
    const formatDateForInput = (dateString: string): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            // פורמט datetime-local: "2026-01-13T10:30"
            return date.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    const formatDateForServer = (dateString: string): string => {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            // פורמט MySQL: "2026-01-13 10:30:00"
            return date.toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
            return '';
        }
    };

    const fetchExam = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/view`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const exam = data.exam;
                    console.log("exam", exam);
                    
                    // שמירת נתונים מקוריים להשוואה
                    setOriginalData(exam);
                    setExamCode(exam.exam_code);

                    // הגדרת פרטי מבחן
                    setExamDetails({
                        title: exam.title || '',
                        description: exam.description || '',
                        duration_minutes: exam.duration_minutes || 60,
                        passing_grade: exam.passing_grade || 60,
                        // תיקון התאריכים לפורמט datetime-local
                        start_time: exam.start_time ? formatDateForInput(exam.start_time) : '',
                        end_time: exam.end_time ? formatDateForInput(exam.end_time) : '',
                        show_timer: exam.show_timer ?? true,
                        show_grade_immediately: exam.show_grade_immediately ?? false,
                        show_review_after_exam: exam.show_review_after_exam ?? false,
                        track_window_switches: exam.track_window_switches ?? true,
                    });

                    // המרת שאלות לפורמט של העריכה
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
                    console.log("convertedQuestions", (convertedQuestions));

                    setQuestions(convertedQuestions);
                } else {
                    setError(data.error || 'שגיאה בטעינת המבחן');
                }
            } else {
                setError('שגיאה בטעינת המבחן');
            }
        } catch (err) {
            setError('שגיאה בחיבור לשרת');
        } finally {
            setIsLoading(false);
        }
    };
    const handleCancel = () => {
        if (hasUnsavedChanges()) {
            if (!window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?')) {
                return; // לא עוזבים
            }
        }
        navigate(`/teacher/exam/${examId}/view`);
    };

    const hasUnsavedChanges = () => {
        if (!originalData) return false;

        // השוואה בסיסית - במציאות תרצה השוואה מעמיקה יותר
        return (
            examDetails.title !== (originalData.title || '') ||
            examDetails.description !== (originalData.description || '') ||
            examDetails.duration_minutes !== originalData.duration_minutes ||
            questions.length !== originalData.questions.length
        );
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

        const invalidQuestions = questions.filter(q => !q.question_text.trim() || !q.correct_answer);
        if (invalidQuestions.length > 0) {
            console.log(invalidQuestions);

            alert('יש שאלות ללא טקסט');
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
            alert('יש שאלות קוד חסרות שפת תכנות או שחסר תיאור לתשובה נכונה');
            return false;
        }

        return true;
    };

    const saveExam = async (newStatus?: 'draft' | 'active') => {
        if (!validateExam()) return;

        setIsSaving(true);
        try {
            const examData = {
                ...examDetails,
                 // המר תאריכים לפורמט שרת
                start_time: formatDateForServer(examDetails.start_time),
                end_time: formatDateForServer(examDetails.end_time),
                questions,
                status: newStatus || originalData?.status
            };

            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(examData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    navigate(`/teacher/exam/${examId}/view`); // תוסיף בקובץ האמיתי
                    alert('המבחן עודכן בהצלחה');
                } else {
                    alert(result.message || 'שגיאה בעדכון המבחן');
                }
            } else {
                alert('שגיאה בחיבור לשרת');
            }
        } catch (error) {
            alert('שגיאה בעדכון המבחן');
        } finally {
            setIsSaving(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `q_new_${Date.now()}`,
            question_text: '',
            question_type: 'multiple_choice',
            points: 1,
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
        console.log(questions);
        return questions.reduce((sum, q) => sum + Number(q.points), 0);
    };

    if (isLoading) {
        return (
            <div className="edit-exam-page">
                <div className="edit-exam-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">טוען מבחן לעריכה...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="edit-exam-page">
                <div className="edit-exam-container">
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
        <div className="edit-exam-page">
            <div className="edit-exam-container">
                <header className="edit-exam-header">
                    <div className="header-content">
                        <div>
                            <h1 className="page-title">עריכת מבחן</h1>
                            <span className="exam-code-display">{examCode}</span>
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
                                onClick={() => saveExam()}
                                disabled={isSaving}
                            >
                                {isSaving ? 'שומר...' : 'שמור שינויים'}
                            </button>
                            {originalData?.status === 'draft' && (
                                <button
                                    className="btn btn-publish"
                                    onClick={() => saveExam('active')}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'מפרסם...' : 'שמור ופרסם'}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {hasUnsavedChanges() && (
                    <div className="changes-notice">
                        <span className="changes-notice-icon">⚠️</span>
                        יש לך שינויים שטרם נשמרו
                    </div>
                )}

                <div className="edit-exam-content">
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

export default EditExam;