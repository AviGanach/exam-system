import { useState } from 'react';
import ExamInfoModal from '../ExamInfoModal';
import './ExamCodeModal.css';


interface ExamCodeModalProps {
  onClose: () => void;
}

const ExamCodeModal = ({ onClose }: ExamCodeModalProps) => {
  const [examCode, setExamCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [examInfo, setExamInfo] = useState(null);
  const [showExamInfo, setShowExamInfo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (examCode.length < 5) return;
    console.log(`Verifying exam code: ${examCode}`);
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/student/exam_info/${examCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setExamInfo(data.exam_info);
        setShowExamInfo(true);
      } else {
        console.log(data.message || 'קוד מבחן לא תקין')
        setError(data.message || 'קוד מבחן לא תקין');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setExamCode(value);
    setError('');
  };



  return (
    <div className="exam-modal-overlay" onClick={onClose}>
      {showExamInfo && examInfo ? (
        <ExamInfoModal
          examInfo={examInfo}
          examCode={examCode}
          onClose={() => {
            setShowExamInfo(false);
            onClose();
          }}
          onBack={() => setShowExamInfo(false)}
        />
      ) : (
        <div className="exam-code-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="exam-close-button" onClick={onClose}>×</button>

          <div className="modal-header">
            <h2>הכנסת קוד מבחן</h2>
            <p>הכנס את הקוד שקיבלת מהמורה</p>
          </div>

          {error && (
            <div className="exam-error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="exam-code-form">
            <div className="exam-form-group">
              <label>קוד מבחן:</label>
              <input
                type="text"
                value={examCode}
                onChange={handleCodeChange}
                placeholder="הכנס קוד מבחן"
                className="exam-code-input"
                maxLength={10}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="verify-button"
              disabled={examCode.length < 5 || isLoading}
            >
              {isLoading ? 'בודק...' : 'אישור'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExamCodeModal;