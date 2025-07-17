import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // To access state passed via navigation
import CodeEditor from "./CodeEditor"; // Import the CodeEditor component
import axios from "axios";
import "./FileEditor.css"; // Import the enhanced styles

// Enhanced Modal component for commit message input
const CommitModal = ({
  isVisible,
  onClose,
  onCommit,
  commitTitle,
  setCommitTitle,
}) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-code-branch"></i>
            <span>Create Commit</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="input-group">
            <label htmlFor="commit-title">Commit Message</label>
            <input
              id="commit-title"
              type="text"
              placeholder="Enter your commit message..."
              value={commitTitle}
              onChange={(e) => setCommitTitle(e.target.value)}
              className="commit-input"
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-cancel" onClick={onClose}>
            <i className="fas fa-times"></i>
            Cancel
          </button>
          <button
            className="btn btn-commit"
            onClick={onCommit}
            disabled={!commitTitle.trim()}
          >
            <i className="fas fa-check"></i>
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const FileEditor = () => {
  const location = useLocation();
  const { file, roomId, folderPaths } = location.state || {};

  const [code, setCode] = useState("");
  const [codeHistory, setCodeHistory] = useState([]);
  const [latestAuthor, setLatestAuthor] = useState("");
  const [username, setUsername] = useState("");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [commitTitle, setCommitTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("seti");

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (file) {
      const fetchFileContent = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(
            `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(
              folderPaths
            )}/${file.filename}`,
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
          console.error("Error fetching file content:", error);
        }
      };

      fetchFileContent();
    }
  }, [file, roomId, folderPaths]);

  useEffect(() => {
    if (latestAuthor) {
      const fetchUserName = async () => {
        try {
          const userResponse = await axios.get(
            `${API_URL}/api/auth/${latestAuthor}`
          );
          setUsername(userResponse.data.name);
        } catch (error) {
          console.error("Error fetching user name:", error);
        }
      };

      fetchUserName();
    }
  }, [latestAuthor]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  const toggleVersionHistory = () => {
    console.log(
      "Toggle version history clicked, current state:",
      showVersionHistory
    );
    setShowVersionHistory(!showVersionHistory);
    setShowThemeSelector(false); // Close theme selector if open
  };

  const handleVersionClick = (versionCode) => {
    setCode(versionCode);
    setShowVersionHistory(false);
  };

  const handleCommitButtonClick = () => {
    setIsModalOpen(true);
  };

  const handleCommit = async () => {
    const token = localStorage.getItem("token");
    if (!commitTitle) {
      alert("Please enter a commit title.");
      return;
    }

    try {
      const paths = folderPaths ? folderPaths : "";
      const response = await fetch(
        `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(paths)}/${
          file.filename
        }/commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, title: commitTitle }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert("Code committed successfully!");
        setIsModalOpen(false);
        setCommitTitle("");
      } else {
        alert(`Error committing code: ${data.message}`);
      }
    } catch (error) {
      console.error("Error committing code:", error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    setShowThemeSelector(false);
  };

  const toggleThemeSelector = () => {
    console.log(
      "Toggle theme selector clicked, current state:",
      showThemeSelector
    );
    setShowThemeSelector(!showThemeSelector);
    setShowVersionHistory(false); // Close version history if open
  };

  const getThemeIcon = (theme) => {
    const icons = {
      seti: "fas fa-moon",
      material: "fas fa-palette",
      monokai: "fas fa-adjust",
      dracula: "fas fa-eye",
    };
    return icons[theme] || "fas fa-paint-brush";
  };

  return (
    <div className="file-editor-container">
      {/* Enhanced Header */}
      <div className="file-editor-header">
        <div className="file-info">
          <div className="file-details">
            <h1 className="file-name">
              <i className="fas fa-file-code"></i>
              {file?.filename}
            </h1>
            {latestAuthor && username && (
              <p className="last-edited">
                <i className="fas fa-user-edit"></i>
                Last edited by <strong>{username}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="editor-controls">
          {/* Version History Button */}
          <div className="control-group" style={{ position: "relative" }}>
            <button
              className={`btn btn-version ${
                showVersionHistory ? "active" : ""
              }`}
              onClick={toggleVersionHistory}
              title="View Version History"
              style={{
                backgroundColor: showVersionHistory ? "#48bb78" : "#667eea",
              }}
            >
              <i className="fas fa-history"></i>
              Version History
              {showVersionHistory && (
                <span style={{ marginLeft: "8px" }}>✓</span>
              )}
            </button>
          </div>

          {/* Commit Button */}
          <button
            className="btn btn-commit"
            onClick={handleCommitButtonClick}
            title="Commit Your Changes"
          >
            <i className="fas fa-save"></i>
            Commit Code
          </button>

          {/* Theme Selector */}
          <div className="control-group" style={{ position: "relative" }}>
            <button
              className={`btn btn-theme ${showThemeSelector ? "active" : ""}`}
              onClick={toggleThemeSelector}
              title="Change Editor Theme"
              style={{
                backgroundColor: showThemeSelector ? "#9f7aea" : "#667eea",
              }}
            >
              <i className={getThemeIcon(currentTheme)}></i>
              {showThemeSelector && (
                <span style={{ marginLeft: "8px" }}>✓</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="file-editor-content">
        <CodeEditor
          code={code}
          onCodeChange={handleCodeChange}
          roomId={roomId}
          filename={file?.filename}
          folderPaths={folderPaths}
          theme={currentTheme}
        />
      </div>

      {/* Enhanced Commit Modal */}
      <CommitModal
        isVisible={isModalOpen}
        onClose={handleCloseModal}
        onCommit={handleCommit}
        commitTitle={commitTitle}
        setCommitTitle={setCommitTitle}
      />

      {/* Version History Dropdown - Using fixed overlay like commit modal */}
      {showVersionHistory && (
        <div
          className="modal-overlay"
          onClick={() => setShowVersionHistory(false)}
        >
          <div
            className="dropdown-modal version-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <h3>
                <i className="fas fa-clock"></i>
                Version History
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowVersionHistory(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dropdown-content">
              {codeHistory.length > 0 ? (
                <ul className="version-list">
                  {codeHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <li key={index} className="version-item">
                        <button
                          className="version-btn"
                          onClick={() => handleVersionClick(entry.code)}
                          title={`Load version ${codeHistory.length - index}`}
                        >
                          <div className="version-info">
                            <span className="version-number">
                              v{codeHistory.length - index}
                            </span>
                            <span className="version-title">{entry.title}</span>
                          </div>
                          <i className="fas fa-arrow-right"></i>
                        </button>
                      </li>
                    ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-code-branch"></i>
                  <p>No version history available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Theme Selector Dropdown - Using fixed overlay like commit modal */}
      {showThemeSelector && (
        <div
          className="modal-overlay"
          onClick={() => setShowThemeSelector(false)}
        >
          <div
            className="dropdown-modal theme-selector-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              <h3>
                <i className="fas fa-palette"></i>
                Choose Theme
              </h3>
              <button
                className="close-btn"
                onClick={() => setShowThemeSelector(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dropdown-content">
              {[
                { name: "seti", label: "Seti UI", icon: "fas fa-moon" },
                { name: "material", label: "Material", icon: "fas fa-palette" },
                { name: "monokai", label: "Monokai", icon: "fas fa-adjust" },
                { name: "dracula", label: "Dracula", icon: "fas fa-eye" },
              ].map((theme) => (
                <button
                  key={theme.name}
                  className={`theme-option ${
                    currentTheme === theme.name ? "active" : ""
                  }`}
                  onClick={() => changeTheme(theme.name)}
                >
                  <i className={theme.icon}></i>
                  <span>{theme.label}</span>
                  {currentTheme === theme.name && (
                    <i className="fas fa-check"></i>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileEditor;
