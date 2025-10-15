import { useEffect, useState } from 'react';
import './AdminDashboard.css';

interface AdminDashboardProps {
  user: any;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCurrentPassword();
  }, []);

  const fetchCurrentPassword = async () => {
    // שליפת הסיסמה הנוכחית מהשרת
    try {
      const response = await fetch('/api/admin/teacher-password', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCurrentPassword(data.password);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // שליחת הסיסמה החדשה לשרת
    try {
      const response = await fetch('/api/admin/update-teacher-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ newPassword: currentPassword })
      });
      const data = await response.json();
      if (data.success) {
        alert('Password updated successfully');
      } else {
        alert('Failed to update password');
      }
    } catch (err) {
      console.error('Error updating password:', err);
    }
  };

  const handleEmailUpdate = async () => {
    // שליחת המייל החדש לשרת
    try {
      const response = await fetch('/api/admin/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ newEmail: adminEmail })
      });
      const data = await response.json();
      if (data.success) {
        alert('Password updated successfully');
      } else {
        alert('Failed to update password');
      }
    } catch (err) {
      console.error('Error updating email:', err);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-content">
        <h1>סיסמת מורים</h1>
        <p>סיסמה זו נשמרת אצל כל המורים להתחברות למערכת</p>

        <div className="password-section">
          <label>סיסמה נוכחית:</label>
          <input
            type="text"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="password-input"
            disabled={isLoading}
          />
        </div>

        <button onClick={handlePasswordUpdate} className="update-password-btn">
          עדכון סיסמה
        </button>

        <div className="admin-info">
          <h2>פרטי התקשרות אדמין</h2>
          <p>המייל ישמש לשליחת קודי אימות</p>

          <div className="email-section">
            <label>מייל אדמין:</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="email-input"
            />
          </div>

          <button onClick={handleEmailUpdate} className="update-email-btn">
            עדכון מייל
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;