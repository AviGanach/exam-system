import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminVerificationModal from '../AdminVerificationModal';
import API_URL from '../../config';
import './TeacherLoginModal.css';

interface TeacherLoginModalProps {
  onClose: () => void;
  setUser: (user: any) => void;
}

const TeacherLoginModal = ({ onClose, setUser }: TeacherLoginModalProps) => {
  const [email, setEmail] = useState('');
  const [email2, setEmail2] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdminVerification, setShowAdminVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (email !== email2) {
      alert('האימיילים אינם תואמים');
      setIsLoading(false);
      setEmail('');
      setEmail2('');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        if (data.is_admin) {
          // אדמין - הצג popup אימות
          setShowAdminVerification(true);
        } else {
          // מורה רגיל - עבור ישירות לדף מורה
          setUser({
            token: data.access_token,
            role: 'teacher',
            email: email
          });
          onClose();
          navigate('/teacher/dashboard'); // נווט לדף המורה
        }
      } else {
        setError(data.message || 'שגיאה בהתחברות');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminVerification = async (code: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (data.success) {
        setUser({
          token: data.access_token,
          role: 'admin',
          email: email
        });
        onClose();
        navigate('/admin/dashboard'); // נווט לדף האדמין
      } else {
        setError(data.message || 'קוד שגוי');
        setShowAdminVerification(false);
      }
    } catch (err) {
      setError('שגיאה באימות');
      setShowAdminVerification(false);
    }
  };

  return (
    <div className="teacher-modal-overlay" onClick={onClose}>
      {showAdminVerification ? (
        <AdminVerificationModal
          onClose={() => {
            setShowAdminVerification(false);
            onClose();
          }}
          onVerify={handleAdminVerification}
          email={email}
          password={password}
        />
      ) : (
        <div className="teacher-modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="teacher-close-button" onClick={onClose}>×</button>

          <div className="login-header">
            <h2>התחברות</h2>
            <p>התחבר כדי לנהל מבחנים</p>
          </div>

          {error && (
            <div className="teacher-error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="teacher-form-group">
              <label>אימייל:</label>
              <input
                id='email'
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הכנס את האימייל שלך"
                className="teacher-form-input"
                disabled={isLoading}
              />
                            <input
                id='email'
                type="email"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                placeholder="הכנס את האימייל שלך שנית"
                className="teacher-form-input"
                disabled={isLoading}
              />
            </div>

            <div className="teacher-form-group">
              <label>סיסמה:</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הכנס את הסיסמה שלך"
                  className="teacher-form-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="teacher-login-button"
              disabled={isLoading || !email || !email2 || !password}
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeacherLoginModal;