import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateExam from './pages/CreateExam';
import ExamView from './pages/ExamView';
import EditExamDetails from './pages/EditExamDetails';
import EditExamContent from './pages/EditExamContent';
import ExamRegister from './pages/ExamRegister';
import ExamTakingPage from './pages/ExamTakingPage';
import ExamResults from './pages/ExamResults';

import './App.css';

interface User {
  token: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
}


function App() {
  const [user, setUser] = useState<User | null>(null);
  const AuthGuard = ({ requiredRole }: { requiredRole: 'admin' | 'teacher' | 'student' }) => {
    if (!user) return <Navigate to="/" replace />;
    if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
    return <Outlet />;
  };

  return (
    <Router>
      <div className="App">
        <main>
          <Routes>
            <Route path="/" element={<HomePage setUser={setUser} />} />

            {/* ----- Admin Routes ----- */}
            <Route path="/admin" element={<AuthGuard requiredRole="admin" />}>
              <Route path="dashboard" element={<AdminDashboard user={user} />} />
            </Route>

            {/* ----- Teacher Routes ----- */}
            <Route path="/teacher" element={<AuthGuard requiredRole="teacher" />}>
              <Route path="dashboard" element={user ? <TeacherDashboard user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/create" element={user ? <CreateExam user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/view" element={user ? <ExamView user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/edit_details" element={user ? <EditExamDetails user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/edit_content" element={user ? <EditExamContent user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/results" element={user ? <ExamResults user={user} /> : <Navigate to="/" replace />} />
            </Route>

            {/* ----- Student Routes ----- */}
            <Route path="/student">
              <Route path="exam/:examCode/register" element={<ExamRegister setUser={setUser} />} />
              <Route path="exam/:examCode/start" element={user ? <ExamTakingPage user={user}/> : <Navigate to="/" replace />} />
            </Route>

            {/* ברירת מחדל */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
