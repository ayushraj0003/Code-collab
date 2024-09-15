import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // To access state passed via navigation
import CodeEditor from './CodeEditor'; // Import the CodeEditor component
import axios from 'axios';

// Modal component for commit message input
const CommitModal = ({ isVisible, onClose, onCommit, commitTitle, setCommitTitle }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close-icon" onClick={onClose}>&times;</span>
        <h2>Enter Commit Message</h2>
        <input
          type="text"
          placeholder="Enter commit title"
          value={commitTitle}
          onChange={(e) => setCommitTitle(e.target.value)}
        />
        <button onClick={onCommit}>Confirm Commit</button>
      </div>
    </div>
  );
};

const FileEditor = () => {
  const location = useLocation();
  const { file, roomId, folderPaths } = location.state || {};

  const [code, setCode] = useState('');
  const [codeHistory, setCodeHistory] = useState([]);
  const [latestAuthor, setLatestAuthor] = useState('');
  const [username, setUsername] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [commitTitle, setCommitTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('seti');

  useEffect(() => {
    if (file) {
      const fetchFileContent = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `http://localhost:5000/api/rooms/${roomId}/file/${encodeURIComponent(folderPaths)}/${file.filename}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = response.data;
          setCode(data.content);
          setCodeHistory(data.codeHistory);
          setLatestAuthor(data.latestAuth);
        } catch (error) {
          console.error('Error fetching file content:', error);
        }
      };

      fetchFileContent();
    }
  }, [file, roomId, folderPaths]);

  useEffect(() => {
    if (latestAuthor) {
      const fetchUserName = async () => {
        try {
          const userResponse = await axios.get(`http://localhost:5000/api/auth/${latestAuthor}`);
          setUsername(userResponse.data.name);
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      };

      fetchUserName();
    }
  }, [latestAuthor]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  const toggleVersionHistory = () => {
    setShowVersionHistory(!showVersionHistory);
  };

  const handleVersionClick = (versionCode) => {
    setCode(versionCode);
    setShowVersionHistory(false);
  };

  const handleCommitButtonClick = () => {
    setIsModalOpen(true);
  };

  const handleCommit = async () => {
    const token = localStorage.getItem('token');
    if (!commitTitle) {
      alert('Please enter a commit title.');
      return;
    }

    try {
      const paths = folderPaths ? folderPaths : '';
      const response = await fetch(
        `http://localhost:5000/api/rooms/${roomId}/file/${encodeURIComponent(paths)}/${file.filename}/commit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, title: commitTitle }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert('Code committed successfully!');
        setIsModalOpen(false);
        setCommitTitle('');
      } else {
        alert(`Error committing code: ${data.message}`);
      }
    } catch (error) {
      console.error('Error committing code:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const changeTheme = () => {
    const themes = ['seti', 'material', 'monokai', 'dracula'];
    const nextThemeIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
    setCurrentTheme(themes[nextThemeIndex]);
  };

  return (
    <div className="editor-container">
      <div className="editor-nav">
        <h2 id="file-name">{file?.filename}</h2>
        {latestAuthor && <p>Last edited by: {username}</p>}
        <button className="version" onClick={toggleVersionHistory}>Version History</button>
        <button className="commit-btn" onClick={handleCommitButtonClick}>Commit Code</button>
        {showVersionHistory && (
          <div className="version-history-dropdown">
            <ul>
              {codeHistory.slice().reverse().map((entry, index) => (
                <li key={index}>
                  <button onClick={() => handleVersionClick(entry.code)}>
                    Version {codeHistory.length - index} - {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="editor-content">
        <CodeEditor
          code={code}
          onCodeChange={handleCodeChange}
          roomId={roomId}
          filename={file.filename}
          folderPaths={folderPaths}
          theme={currentTheme}
        />
        <div className="editor-sidebar">
          {/* Theme button inside the sidebar with only icon */}
          <button className="theme-btn" onClick={changeTheme} title="Change Theme">
            <i className="fas fa-paint-brush"></i> {/* Using a FontAwesome icon */}
          </button>
        </div>
      </div>

      {/* Commit Modal */}
      <CommitModal
        isVisible={isModalOpen}
        onClose={handleCloseModal}
        onCommit={handleCommit}
        commitTitle={commitTitle}
        setCommitTitle={setCommitTitle}
      />
    </div>
  );
};

export default FileEditor;
