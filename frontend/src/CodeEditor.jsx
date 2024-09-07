import React, { useEffect, useState } from 'react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); // Initialize socket outside component to avoid multiple connections

const CodeEditor = ({ code, onCodeChange, roomId, filename, folderPaths }) => {
  const [language, setLanguage] = useState('javascript');
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

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

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

  const handleCommit = async () => {
    const token = localStorage.getItem('token');
    // const username = localStorage.getItem('username') || 'Unknown User';
    // console.log(username);
    try {
      const paths= folderPaths ? folderPaths  : ''
      const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/file/${paths}/${filename}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code}),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Code committed successfully!');
      } else {
        alert(`Error committing code: ${data.message}`);
      }
    } catch (error) {
      console.error('Error committing code:', error);
    }
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

      <button onClick={handleCommit}>Commit Code</button> {/* Add Commit button */}

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
