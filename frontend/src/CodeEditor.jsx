import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Adjust the URL as needed

const CodeEditor = ({ code, onCodeChange, roomId }) => {
  const [language, setLanguage] = useState('javascript');
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (roomId) {
      socket.emit('joinRoom', roomId);

      socket.on('codeUpdate', (updatedCode) => {
        onCodeChange(updatedCode);
      });

      socket.on('userTyping', ({ lineNumber, username }) => {
        console.log(`Typing event received for line ${lineNumber} by ${username}`);
        setTypingUsers((prev) => ({ ...prev, [lineNumber]: username }));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newTypingUsers = { ...prev };
            delete newTypingUsers[lineNumber];
            return newTypingUsers;
          });
        }, 3000);
      });

      return () => {
        socket.emit('leaveRoom', roomId);
      };
    }
  }, [roomId, onCodeChange]);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleCodeChange = (editor, data, value) => {
    onCodeChange(value);
    socket.emit('codeChange', { roomId, code: value });
  };

  const handleCursorActivity = (editor) => {
    const cursor = editor.getCursor();
    const lineNumber = cursor.line + 1; // Convert zero-indexed to one-indexed
    const username = localStorage.getItem('username') || 'Unknown User'; // Retrieve or default to avoid null
    console.log(`Emitting typing event for line ${lineNumber} by ${username}`);
    socket.emit('typing', { roomId, lineNumber, username });
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
        onCursorActivity={handleCursorActivity}
      />

      <div className="typing-indicators">
        <p>jhsadsa</p>
        {Object.keys(typingUsers).map((lineNumber) => (
          <div key={lineNumber}>
            <p>{typingUsers[lineNumber]} is typing on line {lineNumber}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeEditor;
