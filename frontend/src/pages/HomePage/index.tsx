import { useState } from 'react';
import TeacherLoginModal from '../../components/TeacherLoginModal';
import ExamCodeModal from '../../components/ExamCodeModal';
import './HomePage.css';


interface HomePageProps {
  setUser: React.Dispatch<React.SetStateAction<any>>;
}

const HomePage = ({ setUser }: HomePageProps) => {
    const [showTeacherLogin, setShowTeacherLogin] = useState(false);
    const [showExamCode, setShowExamCode] = useState(false);
    return (
        <div className="homepage">
            <div className="homepage-content">
                <h1>מערכת בחינות מקוונת</h1>
                <div className="buttons-container">
                    <button
                        className="main-button teacher-button"
                        onClick={() => setShowTeacherLogin(true)}
                    >
                        כניסת מורה
                    </button>
                    <button
                        className="main-button student-button"
                        onClick={() => setShowExamCode(true)}>בחינות</button>

                </div>
            </div>

            {showTeacherLogin && (
                <TeacherLoginModal onClose={() => setShowTeacherLogin(false)} setUser={setUser} />
            )}
            {showExamCode && (
                <ExamCodeModal onClose={() => setShowExamCode(false)} />
            )}
        </div>
    );
};

export default HomePage;