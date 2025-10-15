import './ExamInfoModal.css';

interface ExamInfoModalProps {
  examInfo: any;
  examCode: string;
  onClose: () => void;
  onBack: () => void;
}

const ExamInfoModal = ({ examInfo, examCode, onClose, onBack }: ExamInfoModalProps) => {
  const handleRegister = () => {
    // מעבר לדף רישום - נממש בהמשך
    console.log('Navigate to registration for exam:', examCode);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="exam-info-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="exam-info-header">
          <h2>{examInfo.title}</h2>
          <p className="exam-description">{examInfo.description}</p>
        </div>

        <div className="exam-details">
          <div className="detail-item">
            <span className="detail-label">משך המבחן:</span>
            <span className="detail-value">{examInfo.duration_minutes} דקות</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">ציון עובר:</span>
            <span className="detail-value">{examInfo.passing_grade}</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">ניקוד מקסימלי:</span>
            <span className="detail-value">{examInfo.max_score}</span>
          </div>

          {examInfo.start_time && (
            <div className="detail-item">
              <span className="detail-label">זמן פתיחה:</span>
              <span className="detail-value">{new Date(examInfo.start_time).toLocaleString('he-IL')}</span>
            </div>
          )}

          {examInfo.end_time && (
            <div className="detail-item">
              <span className="detail-label">זמן סגירה:</span>
              <span className="detail-value">{new Date(examInfo.end_time).toLocaleString('he-IL')}</span>
            </div>
          )}
        </div>

        <div className="exam-status">
          {examInfo.is_available ? (
            <div className="status-available">
              <span>המבחן פתוח להרשמה</span>
            </div>
          ) : (
            <div className="status-unavailable">
              <span>המבחן אינו זמין כרגע</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onBack} className="back-button">
            חזור
          </button>
          
          {examInfo.is_available && (
            <button onClick={handleRegister} className="register-button">
              רישום לבחינה
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamInfoModal;