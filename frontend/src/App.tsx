import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { useState } from 'react';

import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateExam from './pages/CreateExam';
import ExamView from './pages/ExamView';
import EditExam from './pages/EditExam';
import './App.css';

interface User {
  token: string;
  role: 'admin' | 'teacher';
  email: string;
}


function App() {

  const [user, setUser] = useState<User | null>(null); // {token, role, email}

  const AuthGuard = ({ requiredRole }: { requiredRole: 'admin' | 'teacher' }) => {
    if (!user) {
      return <Navigate to="/" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }

    return <Outlet />;
  };


  return (
    <Router>
      <div className="App">
        {/* <Header user={user} setUser={setUser} /> */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage setUser={setUser} />} />
            <Route path="/admin" element={<AuthGuard requiredRole="admin" />}>
              <Route path="dashboard" element={<AdminDashboard user={user} />} />
            </Route>

            <Route path="/teacher" element={<AuthGuard requiredRole="teacher" />}>
              <Route path="dashboard" element={user ? <TeacherDashboard user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/create" element={user ? <CreateExam user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/view" element={user ? <ExamView user={user} /> : <Navigate to="/" replace />} />
              <Route path="exam/:examId/edit" element={user ? <EditExam user={user} /> : <Navigate to="/" replace />} />

              {/* <Route path="exam/:examId/results" element={<ExamResults user={user} />} />
              <Route path="public-exams" element={<PublicExams user={user} />} /> */}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;