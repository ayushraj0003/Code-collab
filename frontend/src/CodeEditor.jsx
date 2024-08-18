import React from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import './styles.css';

function CodeEditor({ code, onCodeChange }) {
  const [language, setLanguage] = React.useState('javascript');

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  return (
    <div className="code-editor-container">
      <select onChange={handleLanguageChange} value={language}>
        <option value="javascript">JavaScript</option>
        <option value="text/x-c++src">C++</option>
        <option value="text/x-java">Java</option>
        <option value="python">Python</option>
      </select>

      <CodeMirror
        value={code}
        options={{
          mode: language,
          theme: 'material',
          lineNumbers: true,
        }}
        onBeforeChange={(editor, data, value) => {
          onCodeChange(value);
        }}
      />
    </div>
  );
}

export default CodeEditor;
