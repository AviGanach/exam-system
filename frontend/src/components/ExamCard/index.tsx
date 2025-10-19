import './ExamCard.css';

interface Exam {
  id: number;
  title: string;
  exam_code: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  created_at: string;
  total_submissions?: number;
}

interface ExamCardProps {
  exam: Exam;
  onCopyCode: (examCode: string) => void;
  onViewExam: (examId: number) => void;
  onViewResults: (examId: number) => void;
}

const ExamCard = ({ exam, onCopyCode, onViewExam, onViewResults }: ExamCardProps) => {
  if (!exam) {
    return null;
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { label: 'פעיל', className: 'active' },
      draft: { label: 'טיוטה', className: 'draft' },
      closed: { label: 'סגור', className: 'closed' }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyCode = () => {
    if (exam.exam_code) {
      onCopyCode(exam.exam_code);
    }
  };

  const handleViewExam = () => {
    if (exam.id) {
      onViewExam(exam.id);
    }
  };

  const handleViewResults = () => {
    if (exam.id) {
      onViewResults(exam.id);
    }
  };

  const statusConfig = getStatusConfig(exam.status || 'draft');

  return (
    <div className="exam-card">
      <div className="exam-card-header">
        <div>
          <h3 className="exam-card-title">
            {exam.title || 'ללא כותרת'}
          </h3>
          <span className={`status-badge ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <p className="exam-card-description">
        {exam.description || 'אין תיאור'}
      </p>

      <div className="exam-code-section">
        <div className="exam-code-label">קוד בחינה</div>
        <div className="exam-code-display">
          <span className="exam-code-value">
            {exam.exam_code || 'N/A'}
          </span>
          <button
            className="copy-code-btn"
            onClick={handleCopyCode}
            disabled={!exam.exam_code}
          >
            העתק
          </button>
        </div>
      </div>

      <div className="exam-stats">
        <div className="stat-item duration">
          <div className="stat-label">משך</div>
          <div className="stat-value duration">
            {exam.duration_minutes || 0} דקות
          </div>
        </div>
        <div className="stat-item submissions">
          <div className="stat-label">הגשות</div>
          <div className="stat-value submissions">
            {exam.total_submissions || 0}
          </div>
        </div>
      </div>

      {(exam.start_time || exam.end_time) && (
        <div className="exam-dates">
          {exam.start_time && (
            <div>פתיחה: {formatDate(exam.start_time)}</div>
          )}
          {exam.end_time && (
            <div>סגירה: {formatDate(exam.end_time)}</div>
          )}
        </div>
      )}

      <div className="exam-actions">
        <button
          className="action-btn copy-btn"
          onClick={handleCopyCode}
          disabled={!exam.exam_code}
        >
          העתק קוד
        </button>
        <button
          className="action-btn view-btn"
          onClick={handleViewExam}
          disabled={!exam.id}
        >
          צפה במבחן
        </button>
        <button
          className="action-btn results-btn"
          onClick={handleViewResults}
          disabled={exam.status === 'draft' || !exam.id}
        >
          תוצאות
        </button>
      </div>

      <div className="exam-footer">
        נוצר: {exam.created_at ? formatDate(exam.created_at) : 'לא ידוע'}
      </div>
    </div>
  );
};

export default ExamCard;