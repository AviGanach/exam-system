import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import './CodeQuestion.css';

interface CodeQuestionProps {
  questionId?: number;               // כדי לאתחל מחדש כששאלה משתנה
  initial_code?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}

export default function CodeQuestion({
  questionId,
  initial_code = '',
  readOnly = false,
  onChange,
}: CodeQuestionProps) {
  const [code, setCode] = useState(initial_code);
  const [theme, setTheme] = useState<'light' | 'vs-dark'>('light');
  const [language, setLanguage] = useState('python');

  const editorRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // אתחול הקוד רק כאשר questionId משתנה (או initial_code שונה משמעותית)
  useEffect(() => {
    setCode(initial_code);
  }, [questionId, initial_code]);

  // mount handler של Monaco - שומר את האובייקט ומריץ layout
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    // הפעלה ראשונית של layout אחרי מעט זמן
    setTimeout(() => editor.layout(), 50);
  };

  // ResizeObserver: אם הגודל של ה-wrapper משתנה, נעדכן את layout
  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver(() => {
      if (editorRef.current && typeof editorRef.current.layout === 'function') {
        editorRef.current.layout();
      }
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // כאשר הקוד משתנה בעורך, נעדכן state פנימי ונודיע להורה
  const handleChange = (value?: string) => {
    const v = value ?? '';
    setCode(v);
    onChange?.(v);
  };

  return (
    <div className="cq-wrapper" ref={wrapperRef}>
      <div className="cq-toolbar">
        <select
          className="cq-language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="cpp">C++</option>
          <option value="java">Java</option>
          <option value="c">C</option>
        </select>

        <button
          className="cq-theme-btn"
          onClick={() => setTheme((t) => (t === 'light' ? 'vs-dark' : 'light'))}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      <div className="cq-editor-container">
        <Editor
          height="350px"
          defaultLanguage={language}
          language={language}
          value={code}
          theme={theme}
          onMount={handleEditorMount}
          onChange={(v) => handleChange(v)}
          options={{
            readOnly,
            automaticLayout: true,
            minimap: { enabled: false },
            scrollbar: { alwaysConsumeMouseWheel: false }
          }}
        />
      </div>
    </div>
  );
}