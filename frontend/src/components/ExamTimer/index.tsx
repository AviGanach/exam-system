// import React, { useState, useEffect } from 'react';
// import './ExamTimer.css';

// interface ExamTimerProps {
//   durationMinutes: number;
//   onTimeUp: () => void;
//   onTimeWarning?: (minutesLeft: number) => void; // התרעה כשנותרו X דקות
// }

// const ExamTimer: React.FC<ExamTimerProps> = ({ 
//   durationMinutes, 
//   onTimeUp, 
//   onTimeWarning 
// }) => {
//   const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // בשניות
//   const [isWarning, setIsWarning] = useState(false);
//   const [isCritical, setIsCritical] = useState(false);

//   useEffect(() => {
//     setTimeRemaining(durationMinutes * 60);
//   }, [durationMinutes]);

//   useEffect(() => {
//     if (timeRemaining <= 0) {
//       onTimeUp();
//       return;
//     }

//     // התרעות
//     const minutesLeft = Math.floor(timeRemaining / 60);
    
//     // התרעה ב-10, 5, 2, 1 דקות
//     if ([10, 5, 2, 1].includes(minutesLeft) && timeRemaining % 60 === 0) {
//       onTimeWarning?.(minutesLeft);
//     }

//     // צבעים לפי זמן
//     if (timeRemaining <= 300) { // 5 דקות - קריטי
//       setIsCritical(true);
//       setIsWarning(false);
//     } else if (timeRemaining <= 600) { // 10 דקות - אזהרה
//       setIsWarning(true);
//       setIsCritical(false);
//     } else {
//       setIsWarning(false);
//       setIsCritical(false);
//     }

//     const timer = setTimeout(() => {
//       setTimeRemaining(prev => prev - 1);
//     }, 1000);

//     return () => clearTimeout(timer);
//   }, [timeRemaining, onTimeUp, onTimeWarning]);

//   const formatTime = (seconds: number): string => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   const getTimerClass = (): string => {
//     if (isCritical) return 'timer-critical';
//     if (isWarning) return 'timer-warning';
//     return 'timer-normal';
//   };

//   const getTimerIcon = (): string => {
//     if (isCritical) return '🚨';
//     if (isWarning) return '⚠️';
//     return '⏰';
//   };

//   return (
//     <div className={`exam-timer ${getTimerClass()}`}>
//       <div className="timer-icon">{getTimerIcon()}</div>
//       <div className="timer-text">
//         <div className="timer-label">זמן נותר</div>
//         <div className="timer-display">{formatTime(timeRemaining)}</div>
//       </div>
//       {isCritical && (
//         <div className="timer-pulse">
//           <div className="pulse-ring"></div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ExamTimer;
import React, { useState, useEffect, useRef } from 'react';
import './ExamTimer.css';

interface ExamTimerProps {
  durationMinutes: number;
  onTimeUp: () => void;
  onTimeWarning?: (minutesLeft: number) => void; // התרעה כשנותרו X דקות
}

const ExamTimer: React.FC<ExamTimerProps> = ({ 
  durationMinutes, 
  onTimeUp, 
  onTimeWarning 
}) => {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60); // בשניות
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  
  // זמן התחלת המבחן
  const examStartTime = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(Date.now());

  useEffect(() => {
    setTimeRemaining(durationMinutes * 60);
    examStartTime.current = Date.now();
    lastUpdateTime.current = Date.now();
  }, [durationMinutes]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    // התרעות
    const minutesLeft = Math.floor(timeRemaining / 60);
    
    // התרעה ב-10, 5, 2, 1 דקות
    if ([10, 5, 2, 1].includes(minutesLeft) && timeRemaining % 60 === 0) {
      onTimeWarning?.(minutesLeft);
    }

    // צבעים לפי זמן
    if (timeRemaining <= 300) { // 5 דקות - קריטי
      setIsCritical(true);
      setIsWarning(false);
    } else if (timeRemaining <= 600) { // 10 דקות - אזהרה
      setIsWarning(true);
      setIsCritical(false);
    } else {
      setIsWarning(false);
      setIsCritical(false);
    }

    const timer = setInterval(() => {
      const now = Date.now();
      
      // בדוק אם יש פער זמן גדול (יותר מ-2 שניות) = חזרה מכרטיסייה אחרת
      const timeDiff = now - lastUpdateTime.current;
      if (timeDiff > 2000) {
        // חישב כמה זמן עבר בפועל מתחילת המבחן
        const actualElapsedTime = Math.floor((now - examStartTime.current!) / 1000);
        const correctTimeRemaining = (durationMinutes * 60) - actualElapsedTime;
        
        setTimeRemaining(Math.max(0, correctTimeRemaining));
      } else {
        // עדכון רגיל - הפחת שנייה
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }
      
      lastUpdateTime.current = now;
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTimeUp, onTimeWarning, durationMinutes]);

  // מעקב אחר החלפת כרטיסיות כדי לתקן את הזמן
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && examStartTime.current) {
        // חזרנו לכרטיסייה - תקן את הזמן לפי הזמן האמיתי שעבר
        const now = Date.now();
        const actualElapsedTime = Math.floor((now - examStartTime.current) / 1000);
        const correctTimeRemaining = (durationMinutes * 60) - actualElapsedTime;
        
        setTimeRemaining(Math.max(0, correctTimeRemaining));
        lastUpdateTime.current = now;
        
        console.log(`🔄 תוקן זמן הטיימר: ${Math.floor(correctTimeRemaining / 60)}:${(correctTimeRemaining % 60).toString().padStart(2, '0')}`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [durationMinutes]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = (): string => {
    if (isCritical) return 'timer-critical';
    if (isWarning) return 'timer-warning';
    return 'timer-normal';
  };

  const getTimerIcon = (): string => {
    if (isCritical) return '🚨';
    if (isWarning) return '⚠️';
    return '⏰';
  };

  return (
    <div className={`exam-timer ${getTimerClass()}`}>
      <div className="timer-icon">{getTimerIcon()}</div>
      <div className="timer-text">
        <div className="timer-label">זמן נותר</div>
        <div className="timer-display">{formatTime(timeRemaining)}</div>
      </div>
      {isCritical && (
        <div className="timer-pulse">
          <div className="pulse-ring"></div>
        </div>
      )}
    </div>
  );
};

export default ExamTimer;