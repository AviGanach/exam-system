import React from 'react';
import './MultipleChoiceQuestion.css';

interface MultipleChoiceQuestionProps {
  id: number;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({id, options, value, onChange }) => {
  return (
    <div className="multiple-choice">
      {options.map((opt, i) => (
        <label key={i} className="choice-option">
          <input
            type="radio"
            name={`multiple-choice-${id}-${i}`}
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
};

export default MultipleChoiceQuestion;
