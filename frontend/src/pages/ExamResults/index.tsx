import React from 'react';
import { useParams } from 'react-router-dom';
import ResultsTable from '../../components/ResultsTable';
import './ExamResults.css';

interface User {
  token: string;
  role: string;
  email: string;
  teacher_id?: number;
}

interface ExamResultsProps {
  user: User;
}

const ExamResults: React.FC<ExamResultsProps> = ({ user }) => {
  const { examId } = useParams<{ examId: string }>();

  if (!examId) {
    return (
      <div className="exam-results-error">
        <h2>שגיאה</h2>
        <p>מזהה מבחן לא נמצא</p>
      </div>
    );
  }

  return (
    <div className="exam-results-container">
      <div className="exam-results-header">
        <h1>תוצאות מבחן</h1>
        <div className="breadcrumbs">
          <span>רשימת מבחנים</span>
          <span className="breadcrumb-separator">{'>'}</span>
          <span>תוצאות מבחן {examId}</span>
        </div>
      </div>
      
      <ResultsTable examId={parseInt(examId, 10)} user={user} />
    </div>
  );
};

export default ExamResults;