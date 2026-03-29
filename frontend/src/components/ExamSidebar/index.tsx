import './ExamSidebar.css';

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

interface ExamSidebarProps {
  questionsCount: number;
  totalPoints: number;
  examDetails: ExamDetails;
}

const ExamSidebar = ({ questionsCount, totalPoints, examDetails }: ExamSidebarProps) => {
  const getValidationAlerts = () => {
    const alerts = [];

    if (!examDetails.title.trim()) {
      alerts.push({ type: 'error', message: 'חסרה כותרת למבחן' });
    }

    if (questionsCount === 0) {
      alerts.push({ type: 'error', message: 'יש להוסיף לפחות שאלה אחת' });
    }

    if (questionsCount > 0 && totalPoints === 0) {
      alerts.push({ type: 'warning', message: 'אין ניקוד לשאלות' });
    }

    if (examDetails.duration_minutes < 5) {
      alerts.push({ type: 'warning', message: 'משך המבחן קצר מאוד' });
    }

    if (examDetails.duration_minutes > 300) {
      alerts.push({ type: 'warning', message: 'משך המבחן ארוך מאוד' });
    }

    if (alerts.length === 0) {
      alerts.push({ type: 'success', message: 'המבחן מוכן לפרסום' });
    }

    return alerts;
  };

  const getCompletionPercentage = () => {
    let completed = 0;
    const total = 4; // מספר השלבים הנדרשים

    if (examDetails.title.trim()) completed++;
    if (questionsCount > 0) completed++;
    if (totalPoints > 0) completed++;
    if (examDetails.duration_minutes >= 5) completed++;

    return Math.round((completed / total) * 100);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}:${remainingMinutes.toString().padStart(2, '0')} שעות` : `${hours} שעות`;
  };


  const handlePreview = () => {
    if (questionsCount === 0) {
      alert('יש להוסיף שאלות לפני תצוגה מקדימה');
      return;
    }

    // פתיחת תצוגה מקדימה - ניתן להוסיף modal או עמוד נפרד
    console.log('Opening exam preview...');
  };

  const alerts = getValidationAlerts();
  const completionPercentage = getCompletionPercentage();

  return (
    <div>
      <div className="sidebar-section">
        <h3 className="sidebar-title">סיכום המבחן</h3>
        <div className="exam-summary">
          <div className="summary-item">
            <span className="summary-label">כותרת:</span>
            <span className="summary-value">
              {examDetails.title.trim() || 'לא הוגדר'}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">שאלות:</span>
            <span className={`summary-value ${questionsCount > 0 ? 'success' : 'error'}`}>
              {questionsCount}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">סך נקודות:</span>
            <span className={`summary-value ${totalPoints > 0 ? 'highlight' : 'warning'}`}>
              {totalPoints}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">משך:</span>
            <span className="summary-value">
              {formatDuration(examDetails.duration_minutes)}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">ציון עובר:</span>
            <span className="summary-value">
              {examDetails.passing_grade}%
            </span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">הגדרות זמן</h3>
        <div className="exam-status">
          <div className="summary-item">
            <span className="summary-label">פתיחה:</span>
            <span className="summary-value">
              {examDetails.start_time}
            </span>
          </div>

          <div className="summary-item">
            <span className="summary-label">סגירה:</span>
            <span className="summary-value">
              {examDetails.end_time}
            </span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">התקדמות</h3>
        <div className="exam-status">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <div className="summary-item">
            <span className="summary-label">הושלם:</span>
            <span className="summary-value highlight">
              {completionPercentage}%
            </span>
          </div>

          <div className="status-item">
            <div className={`status-icon ${examDetails.title.trim() ? 'complete' : 'incomplete'}`}></div>
            <span className="status-text">כותרת מבחן</span>
          </div>

          <div className="status-item">
            <div className={`status-icon ${questionsCount > 0 ? 'complete' : 'incomplete'}`}></div>
            <span className="status-text">שאלות</span>
          </div>

          <div className="status-item">
            <div className={`status-icon ${totalPoints > 0 ? 'complete' : 'incomplete'}`}></div>
            <span className="status-text">ניקוד</span>
          </div>

          <div className="status-item">
            <div className={`status-icon ${examDetails.duration_minutes >= 5 ? 'complete' : 'incomplete'}`}></div>
            <span className="status-text">משך זמן</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-title">תצוגה מקדימה</h3>
        <div className="preview-section">
          <button
            className="preview-btn"
            onClick={handlePreview}
            disabled={questionsCount === 0}
          >
            תצוגה מקדימה
          </button>

          <div className="exam-code-preview">
            <div className="exam-code-label">קוד המבחן ייווצר בפרסום</div>
            <div className="exam-code-value">??????</div>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-title">התראות</h3>
          <div className="validation-alerts">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert alert-${alert.type}`}>
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <div className="help-section">
          <div className="help-title">עצות לבניית מבחן</div>
          <ul className="help-list">
            <li className="help-item">ודא שכל שאלה ברורה ומובנת</li>
            <li className="help-item">בדוק שיש תשובה נכונה לשאלות אמריקאיות</li>
            <li className="help-item">שקול את משך הזמן לפי מספר השאלות</li>
            <li className="help-item">הוסף תיאור למבחן להבהרה</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExamSidebar;