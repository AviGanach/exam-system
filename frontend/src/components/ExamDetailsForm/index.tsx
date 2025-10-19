import './ExamDetailsForm.css';

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

interface ExamDetailsFormProps {
  examDetails: ExamDetails;
  setExamDetails: React.Dispatch<React.SetStateAction<ExamDetails>>;
}

const ExamDetailsForm = ({ examDetails, setExamDetails }: ExamDetailsFormProps) => {
  const handleInputChange = (field: keyof ExamDetails, value: string | number | boolean) => {
    setExamDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberInput = (field: keyof ExamDetails, value: string) => {
    const numValue = parseInt(value) || 0;
    handleInputChange(field, numValue);
  };

  const formatDateTimeForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const handleDateTimeChange = (field: keyof ExamDetails, value: string) => {
    handleInputChange(field, value);
  };

  return (
    <div>
      <h2 className="section-title">פרטי המבחן</h2>
      
      <div className="form-group">
        <label className="form-label">כותרת המבחן *</label>
        <input
          type="text"
          className="form-input"
          value={examDetails.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="הזן כותרת למבחן"
          maxLength={255}
        />
      </div>

      <div className="form-group">
        <label className="form-label">תיאור המבחן</label>
        <textarea
          className="form-input form-textarea"
          value={examDetails.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="תיאור קצר של המבחן (אופציונלי)"
          maxLength={1000}
        />
      </div>

      <div className="form-group">
        <div className="form-grid-2">
          <div>
            <label className="form-label">משך המבחן (דקות) *</label>
            <input
              type="number"
              className="form-input"
              value={examDetails.duration_minutes}
              onChange={(e) => handleNumberInput('duration_minutes', e.target.value)}
              min="1"
              max="600"
              placeholder="60"
            />
          </div>
          <div>
            <label className="form-label">ציון עובר *</label>
            <input
              type="number"
              className="form-input"
              value={examDetails.passing_grade}
              onChange={(e) => handleNumberInput('passing_grade', e.target.value)}
              min="0"
              max="100"
              placeholder="60"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <div className="form-grid-2">
          <div>
            <label className="form-label">זמן פתיחה</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formatDateTimeForInput(examDetails.start_time)}
              onChange={(e) => handleDateTimeChange('start_time', e.target.value)}
            />
            <div className="form-help-text">
              השאר ריק למבחן ללא הגבלת זמן
            </div>
          </div>
          <div>
            <label className="form-label">זמן סגירה</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formatDateTimeForInput(examDetails.end_time)}
              onChange={(e) => handleDateTimeChange('end_time', e.target.value)}
            />
            <div className="form-help-text">
              השאר ריק למבחן ללא הגבלת זמן
            </div>
          </div>
        </div>
      </div>

      <div className="advanced-settings">
        <h3>הגדרות מתקדמות</h3>
        
        <div className="form-checkbox">
          <input
            type="checkbox"
            id="show_timer"
            checked={examDetails.show_timer}
            onChange={(e) => handleInputChange('show_timer', e.target.checked)}
          />
          <label htmlFor="show_timer">
            הצג טיימר לתלמידים במהלך המבחן
          </label>
        </div>

        <div className="form-checkbox">
          <input
            type="checkbox"
            id="show_grade_immediately"
            checked={examDetails.show_grade_immediately}
            onChange={(e) => handleInputChange('show_grade_immediately', e.target.checked)}
          />
          <label htmlFor="show_grade_immediately">
            הצג ציון מיד בסיום המבחן
          </label>
        </div>

        <div className="form-checkbox">
          <input
            type="checkbox"
            id="track_window_switches"
            checked={examDetails.track_window_switches}
            onChange={(e) => handleInputChange('track_window_switches', e.target.checked)}
          />
          <label htmlFor="track_window_switches">
            מעקב אחר מעבר בין חלונות/טאבים
          </label>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailsForm;