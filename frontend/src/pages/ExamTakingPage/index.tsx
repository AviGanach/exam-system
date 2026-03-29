import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import OpenQuestion from '../../components/questions/OpenQuestion';
import CodeQuestion from '../../components/CodeQuestion';
import MultipleChoiceQuestion from '../../components/questions/MultipleChoiceQuestion';
import ExamTimer from '../../components/ExamTimer';
import AntiCheatMonitor from '../../components/AntiCheatMonitor';
import API_URL from '../../config';
import './ExamTakingPage.css';


interface User {
  token: string;
  role: string;
  email: string;
}
interface ExamTakingPageProps {
  user: User;
}

const ExamTakingPage: React.FC<ExamTakingPageProps> = ({ user }) => {
  const { examCode } = useParams<{ examCode: string }>();
  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [buttonExploded, setButtonExploded] = useState(false);
  const [showExplosion, setShowExplosion] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [windowSwitches, setWindowSwitches] = useState(0);
  const [awayTimes, setAwayTimes] = useState(0);
  const hasFetched = useRef(false);
  const navigate = useNavigate();


  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // פונקציה לטיפול בפעילות חשודה
  const handleSuspiciousActivity = (activityCount: number, awayTime: number) => {
    setWindowSwitches(activityCount);
    setAwayTimes(awayTime);
    console.log(`⚠️ ${activityCount} מעברים, ${awayTime} שניות מחוץ למבחן`);
  };

  // חימום AudioContext כשהקומפוננט נטען
  useEffect(() => {
    const initAudio = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);

        // חימום - נגינה שקטה
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.001);

        console.log('🎵 AudioContext מוכן!');
      } catch (error) {
        console.log('AudioContext not supported');
      }
    };

    // חימום AudioContext בלחיצה/מגע ראשון על הדף
    const handleFirstInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // --- טעינת מבחן ---
  useEffect(() => {
    const fetchExam = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      try {
        const res = await fetch(`${API_URL}/api/student/exam_start/${examCode}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Failed to load exam');
        console.log(data.exam);

        setExam(data.exam);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examCode, user.token]);

  // פונקציה מעודכנת להפעלת קול פיצוץ
  const playExplosionSound = () => {
    if (!audioContext) {
      console.log('❌ AudioContext לא מוכן');
      return;
    }

    try {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;

      // 🔥 פיצוץ 1 - בס עמוק
      const bass = audioContext.createOscillator();
      const bassGain = audioContext.createGain();
      bass.connect(bassGain);
      bassGain.connect(audioContext.destination);
      bass.frequency.setValueAtTime(60, now);
      bass.frequency.exponentialRampToValueAtTime(20, now + 0.3);
      bassGain.gain.setValueAtTime(1.0, now);
      bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      bass.start(now);
      bass.stop(now + 0.3);

      // 💥 פיצוץ 2 - תדר בינוני
      const mid = audioContext.createOscillator();
      const midGain = audioContext.createGain();
      mid.connect(midGain);
      midGain.connect(audioContext.destination);
      mid.frequency.setValueAtTime(200, now);
      mid.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      midGain.gain.setValueAtTime(0.8, now);
      midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      mid.start(now);
      mid.stop(now + 0.4);

      // ⚡ פיצוץ 3 - צליל גבוה חד
      const high = audioContext.createOscillator();
      const highGain = audioContext.createGain();
      high.connect(highGain);
      highGain.connect(audioContext.destination);
      high.frequency.setValueAtTime(800, now);
      high.frequency.exponentialRampToValueAtTime(200, now + 0.2);
      highGain.gain.setValueAtTime(0.6, now);
      highGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      high.start(now);
      high.stop(now + 0.2);

      // 🔊 רעש לבן לאפקט פיצוץ
      const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.3; // רעש בעוצמה בינונית
      }

      const noiseSource = audioContext.createBufferSource();
      const noiseGain = audioContext.createGain();
      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(noiseGain);
      noiseGain.connect(audioContext.destination);
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      noiseSource.start(now);

      console.log('💥🔊💥 פיצוץ טריפל עם רעש!');
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  // --- שליחת מבחן ---
  const handleSubmit = async () => {
    if (!exam || isSubmitting) return;
    try {
      // הפעלת קול פיצוץ
      playExplosionSound();

      // התחלת אנימציית הפיצוץ
      setButtonExploded(true);
      setShowExplosion(true);

      // המתנה קצרה לאנימציית הפיצוץ
      timeoutRef.current = setTimeout(() => {
        setIsSubmitting(true);
      }, 800);

      const response = await fetch(`${API_URL}/api/student/submit_exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          submission_id: exam.submission_id,
          window_switches: windowSwitches,
          total_away_time: awayTimes,
          answers: Object.entries(answers).map(([questionId, value]) => {
            const q = exam.questions.find((q: any) => q.id === Number(questionId))!;
            console.log("Q", q);
            return {
              question_id: Number(questionId),
              selected_option: q.question_type === 'multiple_choice' ? value : null,
              open_answer: q.question_type === 'open_text' ? value : null,
              code_answer: q.question_type === 'code' ? value : null,
            };
          }),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'שליחת מבחן נכשלה');

      // הפסקת האנימציה
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsSubmitting(false);
      setShowExplosion(false);
      setButtonExploded(false);

      if (data.show_grade === true) {
        const passedText = data.passed ? '✅ עברת את המבחן!' : '❌ לא עברת את המבחן';
        alert(`🎉 המבחן נשלח בהצלחה!\n\nהציון שלך: ${data.final_score}\n${passedText}`);
      } else {
        alert('✅ המבחן נשלח בהצלחה! הציון יהיה זמין אצל המורה.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setShowExplosion(false);
      setButtonExploded(false);
      alert('❌ שגיאה בשליחה: ' + err.message);
    }
    // בסיום המבחן חזור לדף הבית
    navigate('/');
  };

  if (loading) return <div className="exam-loading">טוען מבחן...</div>;
  if (error) return <div className="exam-error">{error}</div>;
  if (!exam) return null;

  const handleTimeUp = () => {
    alert('⏰ הזמן נגמר! המבחן יוגש אוטומטית.');
    handleSubmit();
  };

  const handleTimeWarning = (minutesLeft: number) => {
    if (minutesLeft === 5) {
      alert(`⚠️ נותרו רק ${minutesLeft} דקות למבחן!`);
    } else if (minutesLeft === 1) {
      alert(`🚨 נותרה דקה אחת בלבד!`);
    }
  };

  return (
    <div className="exam-container">
      {exam?.exam_info.show_timer === 1 && exam?.exam_info.duration_minutes && (
        <ExamTimer
          durationMinutes={exam.exam_info.duration_minutes}
          onTimeUp={handleTimeUp}
          onTimeWarning={handleTimeWarning}
        />
      )}
      {console.log('exam.track_window_switches:', exam.exam_info?.track_window_switches)}

      {exam.exam_info?.track_window_switches && (
        <AntiCheatMonitor
          isActive={true}
          onSuspiciousActivity={handleSuspiciousActivity}
          showWarnings={true}
        />
      )}

      <h1 className="exam-title">{exam.exam_info?.title}</h1>

      {exam.questions.map((q: any, index: number) => (
        <div key={q.id} className="question-wrapper">
          <h2 className="question-number">שאלה {index + 1}</h2>
          <p className="question-text">{q.question_text}</p>

          {q.question_type === 'open_text' && (
            <OpenQuestion
              value={answers[q.id] || ''}
              onChange={val => handleAnswerChange(q.id, val)}
            />
          )}

          {q.question_type === 'code' && (
            <CodeQuestion
              initial_code={answers[q.id] || q.initial_code || '# כתוב כאן את הקוד שלך'}
              onChange={val => handleAnswerChange(q.id, val)}
            />
          )}

          {q.question_type === 'multiple_choice' && (
            <MultipleChoiceQuestion
              id={q.id}
              options={q.options.map((opt: any) => `${opt.option_letter}. ${opt.option_text}`)}
              value={answers[q.id] || ''}
              onChange={val => handleAnswerChange(q.id, val)}
            />
          )}
        </div>
      ))}

      {/* כפתור שליחה עם אפקט פיצוץ */}
      <div className="submit-button-container">
        {!buttonExploded && !isSubmitting && (
          <button
            className={`submit-btn ${buttonExploded ? 'exploding' : ''}`}
            onClick={handleSubmit}
          >
            🚀 שלח מבחן
          </button>
        )}

        {/* אפקט פיצוץ */}
        {showExplosion && (
          <div className="explosion-container">
            <div className="explosion-particle particle-1">💥</div>
            <div className="explosion-particle particle-2">⭐</div>
            <div className="explosion-particle particle-3">✨</div>
            <div className="explosion-particle particle-4">💫</div>
            <div className="explosion-particle particle-5">🔥</div>
            <div className="explosion-particle particle-6">💥</div>
            <div className="explosion-particle particle-7">⚡</div>
            <div className="explosion-particle particle-8">✨</div>

            {/* שברי כפתור */}
            <div className="button-fragment fragment-1">🚀</div>
            <div className="button-fragment fragment-2">ש</div>
            <div className="button-fragment fragment-3">ל</div>
            <div className="button-fragment fragment-4">ח</div>
          </div>
        )}

        {/* אנימציית טעינה */}
        {isSubmitting && (
          <div className="submission-animation">
            <div className="rocket-loading">
              <div className="rocket">🚀</div>
              <div className="rocket-trail">
                <div className="trail-particle"></div>
                <div className="trail-particle"></div>
                <div className="trail-particle"></div>
              </div>
            </div>
            <div className="loading-text">
              <span className="loading-emoji">📡</span>
              שולח את המבחן לשרת...
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamTakingPage;