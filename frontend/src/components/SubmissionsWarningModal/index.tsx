// components/SubmissionsWarningModal.tsx
import React from 'react';
import './SubmissionsWarningModal.css';

interface SubmissionsWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    submissionCount: number;
    onExportAndDelete: () => void;
    onDeleteOnly: () => void;
}

const SubmissionsWarningModal: React.FC<SubmissionsWarningModalProps> = ({
    isOpen,
    onClose,
    submissionCount,
    onExportAndDelete,
    onDeleteOnly
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content warning-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>⚠️ אזהרה - קיימות הגשות</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <p>
                        למבחן זה יש <strong>{submissionCount} הגשות</strong> של תלמידים.
                        לא ניתן לערוך תוכן מבחן שכבר נענה עליו.
                    </p>
                    
                    <div className="warning-options">
                        <button 
                            className="warning-option-btn export"
                            onClick={onExportAndDelete}
                        >
                            <div className="option-icon">📤</div>
                            <div className="option-text">
                                <h4>הורד ומחק</h4>
                                <p>הורד את ההגשות ומחק אותן מהמערכת</p>
                            </div>
                        </button>
                        
                        <button 
                            className="warning-option-btn delete"
                            onClick={onDeleteOnly}
                        >
                            <div className="option-icon">🗑️</div>
                            <div className="option-text">
                                <h4>מחק בלי להוריד</h4>
                                <p>מחק את ההגשות מהמערכת</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionsWarningModal;