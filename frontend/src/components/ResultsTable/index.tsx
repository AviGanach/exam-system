import React, { useState, useEffect } from 'react';
import API_URL from '../../config';
import './ResultsTable.css';

interface User {
  token: string;
  role: string;
  email: string;
  teacher_id?: number;
}

interface ResultsTableProps {
    examId: number;
    user: User;
}

interface StudentResult {
    student_id: number;
    student_name: string;
    student_email: string;
    start_time: string;
    end_time: string;
    status: string;
    total_score: number;
    max_score: number;
    passed: boolean;
    window_switches: number;
}

interface ExamResultsData {
    exam_title: string;
    submissions: StudentResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ examId, user }) => {
    const [data, setData] = useState<ExamResultsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all');

    useEffect(() => {
        fetchExamResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [examId]);

    const fetchExamResults = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/results`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch results');
            }
            const resultData = await response.json();            
            setData(resultData.submissions);
        } catch (err) {
            setError('שגיאה בטעינת תוצאות המבחן');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExportLoading(true);
            setError(null);
            setSuccessMessage(null);
            
            const response = await fetch(`${API_URL}/api/teacher/exam/${examId}/export_submissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה בייצוא הקובץ');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers.get('content-disposition');
            let filename = `exam_${examId}_submissions_${new Date().toISOString().slice(0,10)}.csv`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            
            setSuccessMessage('הקובץ יוצא בהצלחה!');
            setTimeout(() => setSuccessMessage(null), 3000);
            
        } catch (error: any) {
            console.error('Error exporting results:', error);
            setError(error.message || 'שגיאה בייצוא התוצאות');
        } finally {
            setExportLoading(false);
        }
    };

    const filteredSubmissions = data?.submissions?.filter(submission => {
        const matchesSearch = submission.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            submission.student_email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'passed' && submission.passed) ||
            (statusFilter === 'failed' && !submission.passed);

        return matchesSearch && matchesStatus;
    }) || [];

    if (loading) {
        return (
            <div className="results-loading">
                <p>טוען תוצאות...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="results-error">
                <p>{error}</p>
                <button onClick={fetchExamResults} className="retry-btn">
                    נסה שוב
                </button>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="results-empty">
                <p>לא נמצאו תוצאות למבחן זה</p>
            </div>
        );
    }

    return (
        <div className="results-table-container">
            <div className="results-header">
                <h2>{data.exam_title}</h2>
                <div className="results-actions">
                    <button 
                        onClick={handleExport} 
                        className="export-btn"
                        disabled={exportLoading}
                    >
                        {exportLoading ? 'מייצא...' : 'ייצוא לCSV'}
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="results-filters">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="חיפוש תלמיד..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="status-filter">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'passed' | 'failed')}
                        className="status-select"
                    >
                        <option value="all">כל הסטטוסים</option>
                        <option value="passed">עברו</option>
                        <option value="failed">נכשלו</option>
                    </select>
                </div>
            </div>

            <div className="results-summary">
                <div className="summary-card">
                    <span className="summary-label">סה"כ תלמידים:</span>
                    <span className="summary-value">{data.submissions?.length || 0}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">עברו:</span>
                    <span className="summary-value passed">{data.submissions?.filter(s => s.passed).length || 0}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">נכשלו:</span>
                    <span className="summary-value failed">{data.submissions?.filter(s => !s.passed).length || 0}</span>
                </div>
            </div>

            <div className="results-table-wrapper">
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>ת"ז התלמיד</th>
                            <th>שם התלמיד</th>
                            <th>אימייל</th>
                            <th>זמן התחלה</th>
                            <th>זמן סיום</th>
                            <th>סטטוס</th>
                            <th>החלפות חלון</th>
                            <th>ציון</th>
                            <th>מתוך</th>
                            <th>האם עבר</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubmissions.map((submission) => (
                            <tr key={submission.student_id} className={submission.passed ? 'passed' : 'failed'}>
                                <td className="student-id">{submission.student_id}</td>
                                <td className="student-name">{submission.student_name}</td>
                                <td className="student-email">{submission.student_email}</td>
                                <td className="time">{new Date(submission.start_time).toLocaleString('he-IL')}</td>
                                <td className="time">{new Date(submission.end_time).toLocaleString('he-IL')}</td>
                                <td className="status">{submission.status}</td>
                                <td className="window-switches">{submission.window_switches}</td>
                                <td className="total-score">{submission.total_score}</td>
                                <td className="max-score">{submission.max_score}</td>
                                <td className={`passed ${submission.passed ? 'passed' : 'failed'}`}>
                                    {submission.passed ? 'עבר' : 'נכשל'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredSubmissions.length === 0 && data.submissions && data.submissions.length > 0 && (
                <div className="no-results">
                    <p>לא נמצאו תוצאות המתאימות לחיפוש</p>
                </div>
            )}
        </div>
    );
};

export default ResultsTable;