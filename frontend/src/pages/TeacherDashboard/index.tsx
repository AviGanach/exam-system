import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import ExamCard from '../../components/ExamCard';
import API_URL from '../../config'; 
import './TeacherDashboard.css';

interface User {
  token: string;
  role: string;
  email: string;
  teacher_id?: number;
}

interface TeacherDashboardProps {
  user: User;
}

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

const TeacherDashboard = ({ user }: TeacherDashboardProps) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, []);

  const fetchExams = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/teacher/exams`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExams(data.exams || []);
          // data.has_exams יגיד לנו אם יש מבחנים או לא
        } else {
          setError('שגיאה בטעינת המבחנים');
        }
      } else {
        // שגיאות 404/500 - שגיאות אמיתיות
        setError('שגיאה בחיבור לשרת');
      }
    } catch (err) {
      setError('שגיאה בחיבור לשרת');
    } finally {
      setIsLoading(false);
    }
  };

  const copyExamCode = async (examCode: string) => {
    try {
      await navigator.clipboard.writeText(examCode);
      // TODO: Show success toast
      alert('הקוד הועתק בהצלחה');
    } catch (err) {
      alert('שגיאה בהעתקת הקוד');
    }
  };

  const viewExam = (examId: number) => {
    navigate(`/teacher/exam/${examId}/view`);
  };

  const viewResults = (examId: number) => {
    navigate(`/teacher/exam/${examId}/results`);
  };

  const createNewExam = () => {
    navigate('/teacher/exam/create');
  };

  const viewPublicExams = () => {
    navigate('/teacher/public-exams');
  };

  const getActiveExamsCount = () => {
    return exams.filter(exam => exam.status === 'active').length;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">טוען מבחנים...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <div className="error-message">{error}</div>
        </div>
      );
    }

    if (exams.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-state-card">
            <span className="empty-state-icon">📚</span>
            <p className="empty-state-text">עדיין לא יצרת מבחנים</p>
            <button className="empty-state-btn" onClick={createNewExam}>
              צור מבחן ראשון
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="exams-grid">
        {exams.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            onCopyCode={copyExamCode}
            onViewExam={viewExam}
            onViewResults={viewResults}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div className="header-content">
            <div className="header-info">
              <h1>דשבורד מורה</h1>
              <p>שלום {user?.email || 'מורה'}</p>
            </div>
            <div className="header-actions">
              <button className="header-btn create-exam-btn" onClick={createNewExam}>
                + יצירת מבחן חדש
              </button>
              <button className="header-btn public-exams-btn" onClick={viewPublicExams}>
                מבחנים ציבוריים
              </button>
            </div>
          </div>
        </header>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h3>סך מבחנים</h3>
                <p className="stat-number total-exams">{exams.length}</p>
              </div>
              <div className="stat-icon">📝</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <h3>מבחנים פעילים</h3>
                <p className="stat-number active-exams">{getActiveExamsCount()}</p>
              </div>
              <div className="stat-icon">✅</div>
            </div>
          </div>
        </div>

        <div className="main-content">
          <div className="content-header">
            <h2 className="content-title">המבחנים שלי</h2>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;