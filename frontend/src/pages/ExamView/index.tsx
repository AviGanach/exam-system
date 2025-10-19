import { useState, useEffect } from 'react';
import './ExamView.css';
import { useNavigate, useParams } from 'react-router-dom';

interface User {
    token: string;
    role: string;
    email: string;
    teacher_id?: number;
}

interface ExamViewProps {
    user: User;
}

interface Question {
    id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'open_text' | 'code';
    points: number;
    question_order: number;
    options?: { letter: string; text: string; is_correct: boolean }[];
    programming_language?: string;
    initial_code?: string;
    expected_output?: string;
}

interface Exam {
    id: number;
    title: string;
    exam_code: string;
    description: string;
    duration_minutes: number;
    passing_grade: number;
    start_time: string | null;
    end_time: string | null;
    show_timer: boolean;
    show_grade_immediately: boolean;
    track_window_switches: boolean;
    max_score: number;
    status: 'draft' | 'active' | 'closed';
    created_at: string;
    questions: Question[];
    total_submissions?: number;
}

const ExamView = ({ user }: ExamViewProps) => {
    const { examId } = useParams<{ examId: string }>();
    console.log(examId);
    
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchExam();
    }, [examId]);

    const fetchExam = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/teacher/exam/${examId}/view`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setExam(data.exam);
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

    const handleBack = () => {
        navigate('/teacher/dashboard');
    };

    const handleEdit = () => {
        navigate(`/teacher/exam/${examId}/edit`);
    };

    const handleResults = () => {
        navigate(`/teacher/exam/${examId}/results`);
    };

    const copyExamCode = async () => {
        if (exam?.exam_code) {
            try {
                await navigator.clipboard.writeText(exam.exam_code);
                // Show temporary success feedback
                const button = document.activeElement as HTMLButtonElement;
                const originalText = button.innerHTML;
                button.innerHTML = 'הועתק!';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                alert('שגיאה בהעתקת הקוד');
            }
        }
    };

    const previewExam = () => {
        // Open exam in student view
        window.open(`/exam/${exam?.exam_code}`, '_blank');
    };

    const duplicateExam = () => {
        if (exam && window.confirm('האם אתה בטוח שברצונך לשכפל את המבחן?')) {
            // Call duplicate API
            console.log('Duplicating exam:', exam.id);
        }
    };

    const formatDateTime = (dateTime: string | null) => {
        if (!dateTime) return 'לא הוגדר';
        return new Date(dateTime).toLocaleString('he-IL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusDisplay = (status: string) => {
        const statusMap = {
            active: { label: 'פעיל', class: 'status-active' },
            draft: { label: 'טיוטה', class: 'status-draft' },
            closed: { label: 'סגור', class: 'status-closed' }
        };
        return statusMap[status as keyof typeof statusMap] || statusMap.draft;
    };

    const getQuestionTypeDisplay = (type: string) => {
        const typeMap = {
            multiple_choice: { label: 'אמריקאית', class: 'type-multiple-choice' },
            open_text: { label: 'פתוחה', class: 'type-open-text' },
            code: { label: 'קוד', class: 'type-code' }
        };
        return typeMap[type as keyof typeof typeMap] || typeMap.multiple_choice;
    };

    const getProgrammingLanguageLabel = (lang: string) => {
        const langMap: { [key: string]: string } = {
            python: 'Python',
            javascript: 'JavaScript',
            java: 'Java',
            cpp: 'C++'
        };
        return langMap[lang] || lang;
    };

    if (isLoading) {
        return (
            <div className="exam-view-page">
                <div className="exam-view-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>טוען מבחן...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="exam-view-page">
                <div className="exam-view-container">
                    <div className="error-container">
                        <div className="error-message">{error || 'מבחן לא נמצא'}</div>
                        <button onClick={handleBack} className="action-btn btn-back">
                            חזור
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const statusDisplay = getStatusDisplay(exam.status);

    return (
        <div className="exam-view-page">
            <div className="exam-view-container">
                <header className="exam-view-header">
                    <div className="header-content">
                        <div className="exam-title-section">
                            <h1>{exam.title}</h1>
                            <span className="exam-code">{exam.exam_code}</span>
                            {exam.description && (
                                <p className="exam-description">{exam.description}</p>
                            )}
                        </div>
                        <div className="header-actions">
                            <button onClick={handleBack} className="action-btn btn-back">
                                חזור
                            </button>
                            <button onClick={handleEdit} className="action-btn btn-edit">
                                עריכה
                            </button>
                            <button onClick={handleResults} className="action-btn btn-results">
                                תוצאות
                            </button>
                        </div>
                    </div>
                </header>

                <div className="exam-content">
                    <main className="main-content">
                        <div className="exam-info-grid">
                            <div className="info-card">
                                <div className="info-label">משך המבחן</div>
                                <div className="info-value">{exam.duration_minutes} דקות</div>
                            </div>
                            <div className="info-card">
                                <div className="info-label">ציון עובר</div>
                                <div className="info-value">{exam.passing_grade}%</div>
                            </div>
                            <div className="info-card">
                                <div className="info-label">ניקוד מקסימלי</div>
                                <div className="info-value">{exam.max_score}</div>
                            </div>
                            <div className="info-card">
                                <div className="info-label">מספר שאלות</div>
                                <div className="info-value">{exam.questions.length}</div>
                            </div>
                            <div className="info-card">
                                <div className="info-label">זמן פתיחה</div>
                                <div className="info-value">{formatDateTime(exam.start_time)}</div>
                            </div>
                            <div className="info-card">
                                <div className="info-label">זמן סגירה</div>
                                <div className="info-value">{formatDateTime(exam.end_time)}</div>
                            </div>
                        </div>

                        <section className="questions-section">
                            <h2 className="section-title">שאלות המבחן</h2>
                            {exam.questions.map((question, index) => {
                                const typeDisplay = getQuestionTypeDisplay(question.question_type);

                                return (
                                    <div key={question.id} className="question-card">
                                        <div className="question-header">
                                            <div className="question-number">שאלה {index + 1}</div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span className={`question-type-badge ${typeDisplay.class}`}>
                                                    {typeDisplay.label}
                                                </span>
                                                <span className="question-points">{question.points} נק'</span>
                                            </div>
                                        </div>

                                        <div className="question-text">{question.question_text}</div>

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
                                            <div className="code-details">
                                                <div className="code-language">
                                                    שפת תכנות: {getProgrammingLanguageLabel(question.programming_language || '')}
                                                </div>

                                                {question.initial_code && (
                                                    <div className="code-block">
                                                        <div className="code-label">קוד התחלתי:</div>
                                                        <div className="code-content">{question.initial_code}</div>
                                                    </div>
                                                )}

                                                {question.expected_output && (
                                                    <div className="code-block">
                                                        <div className="code-label">פלט צפוי:</div>
                                                        <div className="code-content">{question.expected_output}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </section>
                    </main>

                    <aside className="sidebar">
                        <section className="stats-section">
                            <h3 className="section-title">סטטיסטיקות</h3>
                            <div className="stat-item">
                                <span className="stat-label">סטטוס:</span>
                                <span className={`stat-value ${statusDisplay.class}`}>
                                    {statusDisplay.label}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">הגשות:</span>
                                <span className="stat-value">{exam.total_submissions || 0}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">נוצר:</span>
                                <span className="stat-value">
                                    {new Date(exam.created_at).toLocaleDateString('he-IL')}
                                </span>
                            </div>
                        </section>

                        <section className="status-section">
                            <h3 className="section-title">הגדרות</h3>
                            <div className="stat-item">
                                <span className="stat-label">טיימר:</span>
                                <span className="stat-value">{exam.show_timer ? 'מופעל' : 'כבוי'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">הצגת ציון:</span>
                                <span className="stat-value">{exam.show_grade_immediately ? 'מיידי' : 'מאוחר'}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">מעקב חלונות:</span>
                                <span className="stat-value">{exam.track_window_switches ? 'מופעל' : 'כבוי'}</span>
                            </div>
                        </section>

                        <section>
                            <h3 className="section-title">פעולות מהירות</h3>
                            <div className="quick-actions">
                                <button onClick={copyExamCode} className="quick-action-btn btn-copy-code">
                                    העתק קוד מבחן
                                </button>
                                <button onClick={previewExam} className="quick-action-btn btn-preview">
                                    תצוגה מקדימה
                                </button>
                                <button onClick={duplicateExam} className="quick-action-btn btn-duplicate">
                                    שכפל מבחן
                                </button>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default ExamView;