import { useState } from 'react';
import API_URL from '../../config';
import './AdminVerificationModal.css';


interface AdminVerificationModalProps {
  onClose: () => void;
  onVerify: (code: string) => void;
  email: string;
  password: string;
}

const AdminVerificationModal = ({ onClose, onVerify, email, password }: AdminVerificationModalProps) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 4) return;

    setIsLoading(true);
    try {
      await onVerify(verificationCode);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setVerificationCode(value);
  };

  const handleResendCode = async () => {
    try {
      setIsLoading(true);

      // קריאה לשרת לשליחת קוד חדש
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.is_admin) {
        alert("new code sent");
      } else {
        alert("Error resending code");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>

        <div className="verification-header">
          <h2>אימות אדמין</h2>
          <p>קוד אימות נשלח למייל שלך</p>
        </div>

        <form onSubmit={handleSubmit} className="verification-form">
          <div className="form-group">
            <label>קוד אימות:</label>
            <input
              type="text"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="הכנס את הקוד שקיבלת"
              className="verification-input"
              maxLength={4}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="verify-button"
            disabled={verificationCode.length !== 4 || isLoading}
          >
            {isLoading ? 'מאמת...' : 'אימות'}
          </button>

          <button
            type="button"
            className="resend-button"
            onClick={handleResendCode}
          >
            שלח קוד חדש
          </button>

          <button
            type="button"
            className="back-button"
            onClick={onClose}
          >
            חזור להתחברות
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminVerificationModal;