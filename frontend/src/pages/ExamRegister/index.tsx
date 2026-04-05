import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API_URL from '../../config';
import './ExamRegister.css';

interface ExamRegisterProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const ExamRegister = ({ setUser }: ExamRegisterProps) => {
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const { examCode } = useParams<{ examCode: string }>();
  const navigate = useNavigate();

  // הרשמה למבחן
  const register = async () => {
    setLoading(true);
    setMessage('');
    console.log(examCode,fullName,email,idNumber);
    
    try {
      const response = await fetch(`${API_URL}/api/student/register/${examCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, id_number:idNumber, email }),
      });
      
      const data = await response.json();
      console.log(data);
      if (response.ok) {
        // const studentId = data.studentId || data.id || idNumber;
        setMessage(' מעבר למבחן');
        // נווט לעמוד תחילת הבחינה אחרי רישום מוצלח
        console.log("יעבור לדף הבחינה");
        setUser({
            token: data.access_token,
            role: 'teacher',
            email: email
          });
        navigate(`/student/exam/${examCode}/start?student=${idNumber}`);
      } else {
        setMessage(data.message || 'שגיאה בהרשמה');
      }
    } catch (error) {
      setMessage('שגיאה ברשת. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="exam-register-wrapper">
      <div className="exam-register-container">
        <h2 className='exam-register-h2'>רישום למבחן</h2>
        <p>קוד מבחן: {examCode}</p>
        <div className="exam-register-form-group">
          <label className="exam-register-lable">שם מלא:</label>
          <input
            className='exam-register-input'
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="הכנס שם מלא"
          />
        </div>

        <div className="exam-register-form-group">
          <label className='exam-register-lable'>תעודת זהות:</label>
          <input
            className='exam-register-input'
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="הכנס תעודת זהות"
          />
        </div>

        <div className="exam-register-form-group">
          <label className='exam-register-lable'>מייל:</label>
          <input
            className='exam-register-input'
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <button
          className="exam-register-send-btn"
          onClick={register}
          disabled={loading || !fullName || !idNumber || !email}
        >
          {loading ? 'שולח...' : 'הרשם ועבור למבחן'}
        </button>

        {message && <p className="exam-register-message">{message}</p>}
      </div>
    </div>
  );
}

export default ExamRegister;