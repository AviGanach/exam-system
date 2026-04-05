import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EditExamModal from '../../components/EditExamModal';
import SubmissionsWarningModal from '../../components/SubmissionsWarningModal';
import API_URL from '../../config';
import './ExamView.css';


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
    options?: { option_letter: string; option_text: string; is_correct: boolean }[];
    programming_language?: string;
    initial_code?: string;
    correct_answer?: string;
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
}

interface ExamSubmission {
    completed: number;
    in_progress: number;
    abandoned: number;
}

const ExamView = ({ user }: ExamViewProps) => {
    const { examId } = useParams<{ examId: string }>();
    const [exam, setExam] = useState<Exam | null>(null);
    const [examSubmission, setExamSubmission] = useState<ExamSubmission>({
        completed: 0,
        in_progress: 0,
        abandoned: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSubmissionsWarning, setShowSubmissionsWarning] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchExam();
        fetchExamSubmission();
    // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [examId]);

    const fetchExam = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/view`, {
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

    const fetchExamSubmission = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/submission`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setExamSubmission(data.submissions);
                }
            }
        } catch (err) {
            setError('Failed to fetch exam submission :' + err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        navigate('/teacher/dashboard');
    };

    const handleEdit = () => {
        setShowEditModal(true);
        // navigate(`/teacher/exam/${examId}/edit`);
    };

    const handleEditDetails = () => {
        setShowEditModal(false);
        navigate(`/teacher/exam/${examId}/edit_details`);
    };

    const handleEditContent = async () => {
        setShowEditModal(false);

        // בדיקה אם יש הגשות
        const submission_count = examSubmission.completed + examSubmission.in_progress;
        if (submission_count > 0) {
            setShowSubmissionsWarning(true);
        } else {
            navigate(`/teacher/exam/${examId}/edit_content`);
        }
    };

    const handleExportAndDelete = async () => {
        try {
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/export_and_delete_submissions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                // בדיקה אם יש קובץ להורדה
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/csv')) {
                    // הורדת הקובץ
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;

                    // שם קובץ דינמי
                    const contentDisposition = response.headers.get('content-disposition');
                    let fileName = `exam_${examId}_submissions.csv`;
                    if (contentDisposition) {
                        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (fileNameMatch && fileNameMatch[1]) {
                            fileName = fileNameMatch[1].replace(/['"]/g, '');
                        }
                    }

                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);

                    alert('ההגשות יוצאו והורדו בהצלחה! ההגשות נמחקו מהמערכת.');
                    setShowSubmissionsWarning(false);

                    // רענן את סטטיסטיקות ההגשות
                    fetchExamSubmission();
                } else {
                    // אין קובץ - רק מחיקה (אם לא היו הגשות)
                    const data = await response.json();
                    alert(data.message || 'ההגשות נמחקו (לא היו הגשות לייצוא)');
                    setShowSubmissionsWarning(false);
                    fetchExamSubmission();
                }
            } else {
                const data = await response.json();
                alert('שגיאה: ' + (data.error || 'לא ידוע'));
            }
        } catch (error) {
            alert('שגיאה בייצוא ומחיקת הגשות');
            console.error('Export error:', error);
        }
    };

    const handleDeleteOnly = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את כל ההגשות והתשובות למבחן זה ללא ייצוא?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/delete_submissions`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            const data = await response.json();

            if (data.success) {
                alert('ההגשות והתשובות למבחן זה נמחקו בהצלחה');
                setShowSubmissionsWarning(false);
                navigate(`/teacher/exam/${examId}/edit_content`);
            } else {
                alert('שגיאה במחיקת הגשות');
            }
        } catch (error) {
            alert('שגיאה במחיקת הגשות');
        }
    };

    const handleResults = () => {
        navigate(`/teacher/exam/${examId}/results`);
    };

    const handleDelete = async () => {
        if (!exam) return;

        const confirmMessage = examSubmission && examSubmission.completed + examSubmission.in_progress > 0
            ? `למבחן זה יש ${examSubmission.completed} הגשות מושלמות${examSubmission.in_progress > 0 ? ` ו-${examSubmission.in_progress} הגשות בתהליך` : ''}. האם אתה בטוח שברצונך למחוק את המבחן לצמיתות?`
            : 'האם אתה בטוח שברצונך למחוק את המבחן לצמיתות?';

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);
        try {
            const forceDelete = examSubmission && examSubmission.completed + examSubmission.in_progress > 0;
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/delete?force=${forceDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert('המבחן נמחק בהצלחה');
                navigate('/teacher/dashboard');
            } else if (data.requires_confirmation) {
                const forceConfirm = window.confirm(
                    `למבחן זה יש ${data.submission_count} הגשות. האם אתה בטוח שברצונך למחוק את המבחן יחד עם כל ההגשות?`
                );

                if (forceConfirm) {
                    // ביצוע מחיקה כפויה
                    const forceResponse = await fetch(`${API_URL}/api/teacher/exam/${examId}/delete?force=true`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });

                    const forceData = await forceResponse.json();
                    if (forceResponse.ok && forceData.success) {
                        alert('המבחן נמחק בהצלחה');
                        navigate('/teacher/dashboard');
                    } else {
                        alert('שגיאה במחיקת המבחן: ' + (forceData.error || 'שגיאה לא ידועה'));
                    }
                }
            } else {
                alert('שגיאה במחיקת המבחן: ' + (data.error || 'שגיאה לא ידועה'));
            }
        } catch (err) {
            alert('שגיאה בחיבור לשרת');
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
        }
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
                            <button
                                onClick={handleDelete}
                                className="action-btn btn-delete"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'מוחק...' : 'מחיקה'}
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
                                                        key={option.option_letter}
                                                        className={`view-option-item ${option.is_correct ? 'option-correct' : 'option-wrong'}`}
                                                    >
                                                        {option.option_letter}. {option.option_text}
                                                        {option.is_correct ? ' ✓' : ' ✗'}
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

                                                {question.correct_answer && (
                                                    <div className="code-block">
                                                        <div className="code-label">פלט צפוי:</div>
                                                        <div className="code-content">{question.correct_answer}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {question.question_type === 'open_text' && question.correct_answer && (
                                            <div className="open-text-answer">
                                                <div className="answer-label">תשובה נכונה:</div>
                                                <div className="answer-content">{question.correct_answer}</div>
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
                                <span className="stat-value">{examSubmission.completed || 0}</span>
                                <span className="stat-label">בתהליך:</span>
                                <span className="stat-value">{examSubmission.in_progress || 0}</span>
                                <span className="stat-label">נטושות:</span>
                                <span className="stat-value">{examSubmission.abandoned || 0}</span>
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
            <EditExamModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onEditDetails={handleEditDetails}
                onEditContent={handleEditContent}
            />

            <SubmissionsWarningModal
                isOpen={showSubmissionsWarning}
                onClose={() => setShowSubmissionsWarning(false)}
                submissionCount={examSubmission.completed + examSubmission.in_progress}
                onExportAndDelete={handleExportAndDelete}
                onDeleteOnly={handleDeleteOnly}
            />
        </div>
    );
};

export default ExamView;