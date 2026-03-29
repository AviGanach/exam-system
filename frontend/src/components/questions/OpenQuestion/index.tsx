import React from 'react';
import './OpenQuestion.css';

interface OpenQuestionProps {
  value: string;
  onChange: (value: string) => void;
}

const OpenQuestion: React.FC<OpenQuestionProps> = ({ value, onChange }) => {
  return (
    <textarea
      className="open-question"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="כתוב את תשובתך כאן..."
    />
  );
};

export default OpenQuestion;