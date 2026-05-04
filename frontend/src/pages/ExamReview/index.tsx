import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import API_URL from '../../config';
import './ExamReview.css';

interface User {
    token: string;
    role: string;
    email: string;
}

interface ExamReviewProps {
    user: User;
}

interface ExamInfo {
    title: string;
    description: string;
    total_questions: number;
}

interface Question {
    id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'open_text' | 'code';
    points: string;
    options?: Array<{
        option_letter: string;
        option_text: string;
    }>;
}

interface StudentAnswer {
    question_id: number;
    answer_text: string | null;
    selected_option: string | null;
    score: number;
    max_question_score: number;
    ai_explanation: string | null;
    correct_answer: string | null;
}

interface NavigationState {
    examInfo: ExamInfo;
    questions: Question[];
    finalScore?: string;
    passed?: string;
    showGrade: boolean;
}

const ExamReview: React.FC<ExamReviewProps> = ({ user }) => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showOnlyWrong, setShowOnlyWrong] = useState(false);

    // Navigation State Data
    const navState = location.state as NavigationState;
    const showGrade = navState?.showGrade || false;
    const examInfo = navState?.examInfo;
    const questions = navState?.questions || [];

    useEffect(() => {
        if (!navState || !examInfo || !questions.length) {
            setError('אין נתוני מבחן זמינים');
            setLoading(false);
            return;
        }

        fetchStudentAnswers();
    }, [submissionId]);

    const fetchStudentAnswers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/student/exam/${submissionId}/review`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch review data');
            }

            const data = await response.json();
            console.log("ANSWERS", data);
            setStudentAnswers(data);

        } catch (err: any) {
            console.error('Review fetch error:', err);
            setError('שגיאה בטעינת נתוני הסקירה');
        } finally {
            setLoading(false);
        }
    };

    const getScoreBackgroundClass = (score: number, maxScore: number) => {
        const percentage = (score / maxScore) * 100;

        if (percentage >= 100) return 'score-perfect';
        if (percentage >= 50) return 'score-partial';
        return 'score-poor';
    };

    const getFilteredQuestions = () => {
        return questions.filter((question) => {
            if (!showOnlyWrong) return true;

            const answer = studentAnswers.find(a => a.question_id === question.id);
            if (!answer) return false;

            return answer.score < answer.max_question_score;
        });
    };

    const navigateToQuestion = (direction: 'prev' | 'next') => {
        const filteredQuestions = getFilteredQuestions();

        if (direction === 'next' && currentQuestionIndex < filteredQuestions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else if (direction === 'prev' && currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const jumpToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
    };

    const renderMultipleChoiceQuestion = (question: Question, answer: StudentAnswer) => {
        return (
            <div className="question-options">
                {question.options?.map((option) => {
                    const isStudentChoice = answer.selected_option === option.option_letter;
                    const isCorrectAnswer = option.option_letter === answer.correct_answer;

                    let optionClass = 'option-item';
                    if (isCorrectAnswer) {
                        optionClass += ' correct-option';
                    }
                    if (isStudentChoice && !isCorrectAnswer) {
                        optionClass += ' student-wrong-option';
                    }

                    return (
                        <div key={option.option_letter} className={optionClass}>
                            <div className="option-header">
                                <span className="option-letter">{option.option_letter}</span>
                                {isStudentChoice && (
                                    <span className="student-choice-indicator">
                                        {isCorrectAnswer ? '✓ הבחירה שלך - נכון' : '✗ הבחירה שלך - לא נכון'}
                                    </span>
                                )}
                                {!isStudentChoice && isCorrectAnswer && (
                                    <span className="correct-answer-indicator">✓ תשובה נכונה</span>
                                )}
                            </div>
                            <p className="option-text">{option.option_text}</p>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderOpenOrCodeQuestion = (question: Question, answer: StudentAnswer) => {
        const scoreClass = getScoreBackgroundClass(answer.score || 0, answer.max_question_score);

        return (
            <div className="open-question-review">
                <div className={`student-answer ${scoreClass}`}>
                    <h4>התשובה שלך:</h4>
                    <div className="answer-content">
                        {question.question_type === 'code' ? (
                            <pre><code>{answer.answer_text || 'לא נענתה'}</code></pre>
                        ) : (
                            <p>{answer.answer_text || 'לא נענתה'}</p>
                        )}
                    </div>

                    {showGrade && (
                        <div className="answer-score">
                            <span className="score-text">ציון: {answer.score || 0}/{answer.max_question_score}</span>
                        </div>
                    )}
                </div>

                {answer.ai_explanation && (
                    <div className="ai-explanation">
                        <div className="explanation-header">
                            <span className="ai-icon">🤖</span>
                            <h4>הסבר והנחיה</h4>
                        </div>
                        <div className="explanation-content">
                            <p>{answer.ai_explanation}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="exam-review-loading">
                <div className="loading-spinner"></div>
                <h2>טוען את סקירת המבחן...</h2>
                <p>מכין עבורך את התוצאות</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="exam-review-error">
                <div className="error-icon">📋</div>
                <h2>בעיה בטעינת הסקירה</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/')} className="back-btn">
                    חזור ללוח הבקרה
                </button>
            </div>
        );
    }

    if (!examInfo || !questions.length) {
        return (
            <div className="exam-review-error">
                <div className="error-icon">📋</div>
                <h2>אין נתוני מבחן</h2>
                <p>לא נמצאו נתוני מבחן לסקירה</p>
                <button onClick={() => navigate('/')} className="back-btn">
                    חזור ללוח הבקרה
                </button>
            </div>
        );
    }

    const filteredQuestions = getFilteredQuestions();
    const currentQuestion = filteredQuestions[currentQuestionIndex];
    const currentAnswer = studentAnswers.find(a => a.question_id === currentQuestion?.id);

    return (
        <div className="exam-review-container">
            {/* Header */}
            <div className="review-header">
                <div className="review-header-content">
                    <div className="exam-title-section">
                        <h1>{examInfo.title}</h1>
                        {examInfo.description && <p className="exam-description">{examInfo.description}</p>}
                    </div>

                    {showGrade && navState.finalScore && (
                        <div className="score-summary">
                            <div className="final-score">
                                <span className="score-value">{navState.finalScore}</span>
                                <span className="score-status">{navState.passed}</span>
                            </div>
                        </div>
                    )}

                    {!showGrade && (
                        <div className="review-mode-indicator">
                            <div className="review-badge">📚 מצב למידה</div>
                            <p>סקירה עם הסברים ללא ציונים</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="review-controls">
                <label className="filter-toggle">
                    <input
                        type="checkbox"
                        checked={showOnlyWrong}
                        onChange={(e) => {
                            setShowOnlyWrong(e.target.checked);
                            setCurrentQuestionIndex(0);
                        }}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">הצג רק תשובות שגויות</span>
                </label>

                <button onClick={() => navigate('/')} className="back-to-dashboard-btn">
                    סיום סקירה
                </button>
            </div>

            {/* Navigation */}
            <div className="questions-navigation">
                <button
                    className="nav-btn prev"
                    onClick={() => navigateToQuestion('prev')}
                    disabled={currentQuestionIndex === 0}
                >
                   → שאלה קודמת
                </button>

                <div className="question-indicators">
                    {filteredQuestions.map((question, index) => {
                        const answer = studentAnswers.find(a => a.question_id === question.id);
                        const isWrong = answer ? answer.score < answer.max_question_score : false;

                        return (
                            <button
                                key={question.id}
                                className={`question-indicator ${index === currentQuestionIndex ? 'active' : ''} ${isWrong ? 'incorrect' : 'correct'}`}
                                onClick={() => jumpToQuestion(index)}
                            >
                                {index + 1}
                            </button>
                        );
                    })}
                </div>

                <button
                    className="nav-btn next"
                    onClick={() => navigateToQuestion('next')}
                    disabled={currentQuestionIndex === filteredQuestions.length - 1}
                >
                    שאלה הבאה ←
                </button>
            </div>

            {/* Question Content */}
            {currentQuestion && currentAnswer && (
                <div className="question-review-card">
                    <div className="question-header">
                        <h3>שאלה {currentQuestionIndex + 1}</h3>
                        <div className="question-points">
                            <span className="max-points">{currentQuestion.points} נקודות</span>
                        </div>
                    </div>

                    <div className="question-text">
                        <p>{currentQuestion.question_text}</p>
                    </div>

                    <div className="question-content">
                        {currentQuestion.question_type === 'multiple_choice'
                            ? renderMultipleChoiceQuestion(currentQuestion, currentAnswer)
                            : renderOpenOrCodeQuestion(currentQuestion, currentAnswer)
                        }
                    </div>
                </div>
            )}

            {filteredQuestions.length === 0 && showOnlyWrong && (
                <div className="no-wrong-answers">
                    <div className="celebration-icon">🎉</div>
                    <h3>כל הכבוד!</h3>
                    <p>ענית נכון על כל השאלות במבחן</p>
                    <button onClick={() => setShowOnlyWrong(false)} className="show-all-btn">
                        הצג את כל השאלות לסקירה
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExamReview;