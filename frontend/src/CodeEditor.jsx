import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/seti.css';
import 'codemirror/mode/javascript/javascript';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Initialize socket outside component to avoid multiple connections

const CodeEditor = ({ code, onCodeChange, roomId, filename, folderPaths, theme }) => {
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    if (roomId) {
      const token = localStorage.getItem('token'); // Assuming token is stored in localStorage

      socket.emit('joinRoom', { roomId, token });

      socket.on('codeUpdate', (updatedCode) => {
        onCodeChange(updatedCode);
      });

      socket.on('userTyping', ({ lineNumber, username }) => {
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
        socket.emit('leaveRoom', { roomId, token });
        socket.off('codeUpdate');
        socket.off('userTyping');
      };
    }
  }, [roomId, onCodeChange]);

  const handleCodeChange = (editor, data, value) => {
    onCodeChange(value);
    socket.emit('codeChange', { roomId, code: value });
  };

  const handleCursorActivity = (editor) => {
    const cursor = editor.getCursor();
    const lineNumber = cursor.line + 1;
    const username = localStorage.getItem('username') || 'Unknown User';
    socket.emit('typing', { roomId, lineNumber, username });
  };

  return (
    <div className="code-editor-container">
      <CodeMirror
        value={code}
        options={{
          mode: 'javascript',
          theme: theme, // Apply the current theme
          lineNumbers: true,
        }}
        onBeforeChange={handleCodeChange}
        onCursorActivity={handleCursorActivity}
      />

      <div className="typing-indicators">
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
