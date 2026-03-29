// components/EditExamModal.tsx
import React, { useState } from 'react';
import './EditExamModal.css';

interface EditExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEditDetails: () => void;
    onEditContent: () => void;
}

const EditExamModal: React.FC<EditExamModalProps> = ({
    isOpen,
    onClose,
    onEditDetails,
    onEditContent
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>עריכת מבחן</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <p>איזה סוג עריכה תרצה לבצע?</p>
                    
                    <div className="edit-options">
                        <button 
                            className="edit-option-btn details"
                            onClick={onEditDetails}
                        >
                            <div className="option-icon">⚙️</div>
                            <div className="option-text">
                                <h4>עריכת הגדרות</h4>
                                <p>שם המבחן, זמנים, הגדרות כלליות</p>
                            </div>
                        </button>
                        
                        <button 
                            className="edit-option-btn content"
                            onClick={onEditContent}
                        >
                            <div className="option-icon">📝</div>
                            <div className="option-text">
                                <h4>עריכת תוכן</h4>
                                <p>שאלות, אפשרויות תשובה, ניקוד</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditExamModal;