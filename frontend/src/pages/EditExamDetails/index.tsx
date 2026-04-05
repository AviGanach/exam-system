import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API_URL from '../../config';
import './EditExamDetails.css';

interface User {
    token: string;
    role: string;
    email: string;
    teacher_id?: number;
}

interface UpdateExamDetailsProps {
    user: User;
}

interface ExamDetails {
    title: string;
    description: string;
    duration_minutes: number;
    passing_grade: number;
    start_time: string | null;
    end_time: string | null;
    show_timer: boolean;
    show_grade_immediately: boolean;
    track_window_switches: boolean;
    status: string;
}

const EditExamDetails = ({ user }: UpdateExamDetailsProps) => {
    const navigate = useNavigate();
    const { examId } = useParams<{ examId: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [examCode, setExamCode] = useState('');

    const [examDetails, setExamDetails] = useState<ExamDetails>({
        title: '',
        description: '',
        duration_minutes: 60,
        passing_grade: 60,
        start_time: null,
        end_time: null,
        show_timer: true,
        show_grade_immediately: false,
        track_window_switches: true,
        status: 'draft'
    });

    const [originalData, setOriginalData] = useState<ExamDetails | null>(null);

    useEffect(() => {
        fetchExamDetails();
    }, [examId]);

    const formatDateForInput = (dateString: string | null): string => {
        if (!dateString) return '';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().slice(0, 16);
        } catch (e) {
            return '';
        }
    };

    const formatDateForServer = (dateString: string | null): string | null => {
        if (!dateString) return null;

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
            return null;
        }
    };

    const fetchExamDetails = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/view`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const exam = data.exam;

                    const details = {
                        title: exam.title || '',
                        description: exam.description || '',
                        duration_minutes: exam.duration_minutes || 60,
                        passing_grade: exam.passing_grade || 60,
                        start_time: exam.start_time ? formatDateForInput(exam.start_time) : null,
                        end_time: exam.end_time ? formatDateForInput(exam.end_time) : null,
                        show_timer: exam.show_timer ?? true,
                        show_grade_immediately: exam.show_grade_immediately ?? false,
                        track_window_switches: exam.track_window_switches ?? true,
                        status: exam.status || 'draft'
                    };

                    setExamDetails(details);
                    setOriginalData(details);
                    setExamCode(exam.exam_code);
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

    const hasUnsavedChanges = () => {
        if (!originalData) return false;

        return JSON.stringify(examDetails) !== JSON.stringify(originalData);
    };

    const handleCancel = () => {
        if (hasUnsavedChanges()) {
            if (!window.confirm('יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?')) {
                return;
            }
        }
        navigate(`/teacher/exam/${examId}/view`);
    };

    const validateForm = () => {
        if (!examDetails.title.trim()) {
            alert('יש להזין כותרת למבחן');
            return false;
        }

        if (examDetails.duration_minutes <= 0) {
            alert('משך המבחן חייב להיות גדול מ-0');
            return false;
        }

        if (examDetails.passing_grade < 0 || examDetails.passing_grade > 100) {
            alert('ציון עובר חייב להיות בין 0 ל-100');
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        try {
            const dataToSend = {
                ...examDetails,
                start_time: formatDateForServer(examDetails.start_time),
                end_time: formatDateForServer(examDetails.end_time),
            };
            console.log('Data being sent:', dataToSend); // ← debug לבדיקה

            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/update_details`, {
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
                    alert('הגדרות המבחן עודכנו בהצלחה');
                    navigate(`/teacher/exam/${examId}/view`);
                } else {
                    alert(result.error || 'שגיאה בעדכון הגדרות המבחן');
                }
            } else {
                alert('שגיאה בחיבור לשרת');
            }
        } catch (error) {
            alert('שגיאה בעדכון הגדרות המבחן');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="update-details-page">
                <div className="update-details-container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">טוען הגדרות מבחן...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="update-details-page">
                <div className="update-details-container">
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
        <div className="update-details-page">
            <div className="update-details-container">
                <header className="update-details-header">
                    <div className="header-content">
                        <div>
                            <h1 className="page-title">עדכון הגדרות מבחן</h1>
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

                <div className="update-details-content">
                    <div className="form-section">
                        <h2 className="section-title">פרטים כלליים</h2>

                        <div className="form-group">
                            <label htmlFor="title">כותרת המבחן *</label>
                            <input
                                type="text"
                                id="title"
                                value={examDetails.title}
                                onChange={(e) => setExamDetails({ ...examDetails, title: e.target.value })}
                                placeholder="הכנס כותרת למבחן"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">תיאור המבחן</label>
                            <textarea
                                id="description"
                                value={examDetails.description}
                                onChange={(e) => setExamDetails({ ...examDetails, description: e.target.value })}
                                placeholder="תיאור קצר על המבחן (אופציונלי)"
                                rows={3}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="duration">משך זמן (דקות) *</label>
                                <input
                                    type="number"
                                    id="duration"
                                    value={examDetails.duration_minutes}
                                    onChange={(e) => setExamDetails({ ...examDetails, duration_minutes: Number(e.target.value) })}
                                    min="1"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="passing_grade">ציון עובר (%) *</label>
                                <input
                                    type="number"
                                    id="passing_grade"
                                    value={examDetails.passing_grade}
                                    onChange={(e) => setExamDetails({ ...examDetails, passing_grade: Number(e.target.value) })}
                                    min="0"
                                    max="100"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="section-title">זמני המבחן</h2>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="start_time">זמן התחלה</label>
                                <input
                                    type="datetime-local"
                                    id="start_time"
                                    value={examDetails.start_time || ""}
                                    onChange={(e) => setExamDetails({ ...examDetails, start_time: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="end_time">זמן סיום</label>
                                <input
                                    type="datetime-local"
                                    id="end_time"
                                    value={examDetails.end_time || ""}
                                    onChange={(e) => setExamDetails({ ...examDetails, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h2 className="section-title">הגדרות מתקדמות</h2>

                        <div className="checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={examDetails.show_timer}
                                    onChange={(e) => setExamDetails({ ...examDetails, show_timer: e.target.checked })}
                                />
                                <span className="checkmark"></span>
                                הצג טיימר לתלמידים
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={examDetails.show_grade_immediately}
                                    onChange={(e) => setExamDetails({ ...examDetails, show_grade_immediately: e.target.checked })}
                                />
                                <span className="checkmark"></span>
                                הצג ציון מיד לאחר הגשה
                            </label>

                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={examDetails.track_window_switches}
                                    onChange={(e) => setExamDetails({ ...examDetails, track_window_switches: e.target.checked })}
                                />
                                <span className="checkmark"></span>
                                עקוב אחר מעברים בין חלונות
                            </label>
                        </div>
                        <div className="form-group">
                            <label htmlFor="status">סטטוס המבחן</label>
                            <select
                                id="status"
                                value={examDetails.status}
                                onChange={(e) => setExamDetails({ ...examDetails, status: e.target.value })}
                            >
                                <option value="draft">📝 טיוטה</option>
                                <option value="active">✅ פעיל</option>
                                <option value="closed">🔒 סגור</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditExamDetails;