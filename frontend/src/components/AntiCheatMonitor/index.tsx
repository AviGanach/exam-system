import React, { useState, useEffect, useRef } from 'react';
import './AntiCheatMonitor.css';

interface AntiCheatMonitorProps {
    isActive: boolean; // האם המעקב פעיל
    onSuspiciousActivity: (activityCount: number, totalTime: number) => void;
    showWarnings?: boolean; // האם להציג התרעות למשתמש
}

interface ActivityEvent {
    type: 'window_blur' | 'tab_hidden' | 'focus_lost';
    timestamp: Date;
    duration?: number; // משך זמן מחוץ לחלון (בשניות)
}

const AntiCheatMonitor: React.FC<AntiCheatMonitorProps> = ({
    isActive,
    onSuspiciousActivity,
    showWarnings = true
}) => {
    console.log('AntiCheatMonitor rendered:', { isActive, showWarnings });

    const [switchCount, setSwitchCount] = useState(0);
    const [isAway, setIsAway] = useState(false);
    const [totalAwayTime, setTotalAwayTime] = useState(0);
    const [lastWarningCount, setLastWarningCount] = useState(0);
    const awayStartTime = useRef<Date | null>(null);
    const activityLog = useRef<ActivityEvent[]>([]);

    // טיפול באירועי החלפת חלונות
    useEffect(() => {
        if (!isActive) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // כל פעם שעוזבים כרטיסייה - ספור
                console.log('Left a tab - counting switch');
                setSwitchCount(prev => {
                    const newCount = prev + 1;
                    logActivity('tab_hidden');
                    onSuspiciousActivity(newCount, Math.round(totalAwayTime));
                    return newCount;
                });
                setIsAway(true);
                awayStartTime.current = new Date();
            } else {
                // חזר לכרטיסייה - רק עדכן סטטוס, בלי לספור
                console.log('Returned to the tab');
                if (isAway && awayStartTime.current) {
                    const duration = (new Date().getTime() - awayStartTime.current.getTime()) / 1000;
                    const currentSwitchCount = switchCount;
                    setTotalAwayTime(prev => {
                        const newTotal = prev + duration;
                        onSuspiciousActivity(currentSwitchCount, Math.round(newTotal));
                        return newTotal;
                    });
                    // עדכון הלוג עם משך הזמן
                    if (activityLog.current.length > 0) {
                        const lastActivity = activityLog.current[activityLog.current.length - 1];
                        lastActivity.duration = duration;
                    }
                }

                setIsAway(false);
                awayStartTime.current = null;
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, onSuspiciousActivity, showWarnings]);        // עדכון הלוג עם משך הזמן

    // התרעות למשתמש על פעילות חשודה
    useEffect(() => {
        if (!showWarnings || switchCount === 0) return;

        // התרעה כל  מעבר חדש
        if (switchCount > lastWarningCount) {
            const warningMessage = `⚠️ זוהה מעבר בין חלונות/כרטיסיות!\n\nמספר מעברים: ${switchCount}\n\nשים לב: פעילות זו מתועדת ונשלחת למורה.`;

            setTimeout(() => {
                alert(warningMessage);
            }, 100);

            setLastWarningCount(switchCount);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [switchCount, lastWarningCount, showWarnings]);

    // רישום פעילות
    const logActivity = (type: ActivityEvent['type']) => {
        const event: ActivityEvent = {
            type,
            timestamp: new Date()
        };
        activityLog.current.push(event);

        // שמירה על 50 האירועים האחרונים בלבד
        if (activityLog.current.length > 50) {
            activityLog.current = activityLog.current.slice(-50);
        }
    };

    if (!isActive) return null;

    return (
        <div className={`anti-cheat-monitor ${isAway ? 'away' : 'active'}`}>
            <div className="monitor-icon">
                {isAway ? '👁️‍🗨️' : '👀'}
            </div>
            <div className="monitor-info">
                <div className="monitor-status">
                    {isAway ? '⚠️ מחוץ לחלון' : '✅ במעקב'}
                </div>
                <div className="switch-counter">
                    מעברים: <span className="count">{switchCount}</span>
                </div>
                {totalAwayTime > 10 && (
                    <div className="away-time">
                        זמן מחוץ לחלון: {Math.round(totalAwayTime)}ש
                    </div>
                )}
            </div>
        </div>
    );
};

export default AntiCheatMonitor;