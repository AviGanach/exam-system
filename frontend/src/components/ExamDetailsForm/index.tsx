import './ExamDetailsForm.css';

interface ExamDetails {
  title: string;
  description: string;
  duration_minutes: number;
  passing_grade: number;
  start_time: string; // YYYY-MM-DDTHH:mm | ''
  end_time: string;   // YYYY-MM-DDTHH:mm | ''
  show_timer: boolean;
  show_grade_immediately: boolean;
  track_window_switches: boolean;
}

interface ExamDetailsFormProps {
  examDetails: ExamDetails;
  setExamDetails: React.Dispatch<React.SetStateAction<ExamDetails>>;
}

const ExamDetailsForm = ({ examDetails, setExamDetails }: ExamDetailsFormProps) => {

  const handleInputChange = (
    field: keyof ExamDetails,
    value: string | number | boolean
  ) => {
    setExamDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberInput = (
    field: keyof ExamDetails,
    value: string
  ) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    handleInputChange(field, numValue);
  };

  const handleDateTimeChange = (
    field: keyof ExamDetails,
    value: string
  ) => {
    // value כבר בפורמט תקין של datetime-local
    handleInputChange(field, value);
  };

  return (
    <div className="edf-container">
      <h2 className="edf-section-title">פרטי המבחן</h2>

      {/* כותרת */}
      <div className="edf-form-group">
        <label className="edf-form-label">כותרת המבחן *</label>
        <input
          type="text"
          className="edf-form-input"
          value={examDetails.title}
          onChange={(e) =>
            handleInputChange('title', e.target.value)
          }
          placeholder="הזן כותרת למבחן"
          maxLength={255}
        />
      </div>

      {/* תיאור */}
      <div className="edf-form-group">
        <label className="edf-form-label">תיאור המבחן</label>
        <textarea
          className="edf-form-input edf-form-textarea"
          value={examDetails.description}
          onChange={(e) =>
            handleInputChange('description', e.target.value)
          }
          placeholder="תיאור קצר של המבחן (אופציונלי)"
          maxLength={1000}
        />
      </div>

      {/* משך וציון עובר */}
      <div className="edf-form-group">
        <div className="edf-form-grid-2">
          <div>
            <label className="edf-form-label">משך המבחן (דקות) *</label>
            <input
              type="number"
              className="edf-form-input"
              value={examDetails.duration_minutes}
              onChange={(e) =>
                handleNumberInput('duration_minutes', e.target.value)
              }
              min={1}
              max={600}
            />
          </div>

          <div>
            <label className="edf-form-label">ציון עובר *</label>
            <input
              type="number"
              className="edf-form-input"
              value={examDetails.passing_grade}
              onChange={(e) =>
                handleNumberInput('passing_grade', e.target.value)
              }
              min={0}
              max={100}
            />
          </div>
        </div>
      </div>

      {/* זמני פתיחה / סגירה */}
      <div className="edf-form-group">
        <div className="edf-form-grid-2">
          <div>
            <label className="edf-form-label">זמן פתיחה</label>
            <input
              type="datetime-local"
              className="edf-form-input"
              value={examDetails.start_time || ''}
              onChange={(e) =>
                handleDateTimeChange('start_time', e.target.value)
              }
            />
            <div className="edf-form-help-text">
              השאר ריק למבחן ללא הגבלת זמן
            </div>
          </div>

          <div>
            <label className="edf-form-label">זמן סגירה</label>
            <input
              type="datetime-local"
              className="edf-form-input"
              value={examDetails.end_time || ''}
              onChange={(e) =>
                handleDateTimeChange('end_time', e.target.value)
              }
            />
            <div className="edf-form-help-text">
              השאר ריק למבחן ללא הגבלת זמן
            </div>
          </div>
        </div>
      </div>

      {/* הגדרות מתקדמות */}
      <div className="edf-advanced-settings">
        <h3>הגדרות מתקדמות</h3>

        <div className="edf-form-checkbox">
          <input
            type="checkbox"
            id="show_timer"
            checked={examDetails.show_timer}
            onChange={(e) =>
              handleInputChange('show_timer', e.target.checked)
            }
          />
          <label htmlFor="show_timer">
            הצג טיימר לתלמידים במהלך המבחן
          </label>
        </div>

        <div className="edf-form-checkbox">
          <input
            type="checkbox"
            id="show_grade_immediately"
            checked={examDetails.show_grade_immediately}
            onChange={(e) =>
              handleInputChange('show_grade_immediately', e.target.checked)
            }
          />
          <label htmlFor="show_grade_immediately">
            הצג ציון מיד בסיום המבחן
          </label>
        </div>

        <div className="edf-form-checkbox">
          <input
            type="checkbox"
            id="track_window_switches"
            checked={examDetails.track_window_switches}
            onChange={(e) =>
              handleInputChange('track_window_switches', e.target.checked)
            }
          />
          <label htmlFor="track_window_switches">
            מעקב אחר מעבר בין חלונות / טאבים
          </label>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailsForm;
