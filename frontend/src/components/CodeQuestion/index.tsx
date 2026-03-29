import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import './CodeQuestion.css';


interface CodeQuestionProps {
  initial_code?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

// מיפוי שפות לשם ול-id ב-Judge0
const LANGUAGES = [
  { id: 71, name: 'Python', value: 'python' },
  { id: 63, name: 'JavaScript', value: 'javascript' },
  { id: 54, name: 'C++', value: 'cpp' },
  { id: 62, name: 'Java', value: 'java' },
  { id: 50, name: 'C', value: 'c' },
];

export default function CodeQuestion({ initial_code , readOnly = false, onChange }: CodeQuestionProps) {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [theme, setTheme] = useState<'vs-light' | 'vs-dark'>('vs-light');
  const [code, setCode] = useState(initial_code);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<any>(null);

  // נעדכן את הקוד רק אם initial_code באמת השתנה
  useEffect(() => {
    if (initial_code !== code) {
      setCode(initial_code);
    }
  }, [initial_code]);

  const handleEditorMount: OnMount = (editor, monaco) => {
  editorRef.current = editor;
  
  // וודא פריסה לאחר טעינה
  setTimeout(() => {
    editor.layout();
    editor.focus(); // הוסף focus כדי לוודא שהסמן פעיל
  }, 100);
};

// הוסף useEffect לטפל בשינויי גודל
useEffect(() => {
  const handleResize = () => {
    if (editorRef.current) {
      requestAnimationFrame(() => {
        editorRef.current.layout();
      });
    }
  };

  window.addEventListener('resize', handleResize);
  
  // Layout initial
  const timer = setTimeout(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, 300);

  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(timer);
  };
}, []);

// וודא פריסה כאשר השפה משתנה
useEffect(() => {
  if (editorRef.current) {
    setTimeout(() => editorRef.current.layout(), 50);
  }
}, [language]);


  const runCode = async () => {
    setLoading(true);
    setOutput('מריץ קוד...');

    try {
      const response = await fetch('/api/student/run_code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: language.id,
      }),
    });

      const data = await response.json();
      setOutput(data.stdout || data.stderr || 'אין פלט');
    } catch (error) {
      setOutput('שגיאה: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'vs-light' ? 'vs-dark' : 'vs-light');
  };

  return (
    <div className={`code-question-container ${theme === 'vs-dark' ? 'dark' : ''}`}>
      <div className="editor-header">
        <div className="left-controls">
          <select
            value={language.value}
            onChange={(e) => {
              const selected = LANGUAGES.find(l => l.value === e.target.value)!;
              setLanguage(selected);
            }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.name}
              </option>
            ))}
          </select>

          <button onClick={toggleTheme}>
            {theme === 'vs-dark' ? 'מצב בהיר ☀️' : 'מצב חשוך 🌙'}
          </button>
        </div>

        <button className="run-btn" onClick={runCode} disabled={loading}>
          {loading ? 'מריץ...' : 'הרץ קוד ▶'}
        </button>
      </div>

      <div className="editor-wrapper">
        <MonacoEditor
          height="400px"
          width="100%"
          language={language.value}
          value={code}
          onMount={handleEditorMount} 
          onChange={(value = '') => {
            if (!readOnly) {
              setCode(value);
              onChange?.(value);
            }
          }}
          theme={theme}
          options={{
            fontSize: 15,
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: readOnly
          }}
        />
      </div>

      <div className="output-section">
        <h4>פלט:</h4>
        <pre>{output}</pre>
      </div>
    </div>
  );
}