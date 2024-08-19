import React, { useEffect } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import './styles.css';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Adjust the URL as needed

function CodeEditor({ roomId, code, onCodeChange }) {
  const [language, setLanguage] = React.useState('javascript');

  useEffect(() => {
    // Join the room for real-time collaboration
    socket.emit('joinRoom', roomId);

    // Listen for code updates from other users
    socket.on('codeUpdate', (updatedCode) => {
      onCodeChange(updatedCode);
    });

    // Clean up on component unmount
    return () => {
      socket.emit('leaveRoom', roomId);
    };
  }, [roomId, onCodeChange]);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleCodeChange = (editor, data, value) => {
    onCodeChange(value);
    socket.emit('codeChange', { roomId, code: value }); // Emit code change to the server
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
        onBeforeChange={handleCodeChange}
      />
    </div>
  );
}

export default CodeEditor;
