import React, { useEffect, useState, useRef } from "react";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/material.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/seti.css";
import "codemirror/mode/javascript/javascript";
import io from "socket.io-client";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CodeEditor = ({
  code,
  onCodeChange,
  roomId,
  filename,
  folderPaths,
  theme,
}) => {
  const [typingUsers, setTypingUsers] = useState({});
  const [currentTypingUser, setCurrentTypingUser] = useState("");
  const [currentUserName, setCurrentUserName] = useState("Unknown User");
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Function to decode user data from JWT token
  const getUserDataFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found in localStorage");
        return { userId: null, token: null };
      }

      // Decode JWT token to get user information
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log("Decoded token payload:", payload);
      console.log(payload.userId);
      return {
        userId: payload.userId || payload.id || payload.sub,
        token: token,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return { userId: null, token: localStorage.getItem("token") };
    }
  };

  const fetchUserName = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        return userData.name || "Unknown User";
      }
      return "Unknown User";
    } catch (error) {
      console.error("Error fetching user name:", error);
      return "Unknown User";
    }
  };

  useEffect(() => {
    if (roomId) {
      // Initialize socket connection
      socketRef.current = io(API_URL);
      const socket = socketRef.current;
      const { userId: currentUserId, token } = getUserDataFromToken();

      console.log("Joining room:", roomId, "with user ID:", currentUserId);

      if (!token || !currentUserId) {
        console.error("No valid token or userId available");
        return;
      }

      // Fetch current user's name
      fetchUserName(currentUserId).then((userName) => {
        setCurrentUserName(userName);
        console.log("Current user name:", userName);
      });

      // Join the room
      socket.emit("joinRoom", { roomId, token });

      // Listen for code updates
      socket.on("codeUpdate", (updatedCode) => {
        onCodeChange(updatedCode);
      });

      // Listen for typing indicators from other users
      socket.on(
        "userTyping",
        async ({
          lineNumber,
          username: typingUsername,
          userId,
          filename: typingFilename,
        }) => {
          console.log("Received typing event:", {
            lineNumber,
            typingUsername,
            userId,
            typingFilename,
          });

          // Don't show typing indicator for current user
          if (
            userId !== currentUserId &&
            userId !== null &&
            userId !== "null"
          ) {
            // If username is not provided or is "Unknown User", fetch it from API
            let displayUsername = typingUsername;
            if (!typingUsername || typingUsername === "Unknown User") {
              displayUsername = await fetchUserName(userId);
            }

            setTypingUsers((prev) => {
              const newTypingUsers = {
                ...prev,
                [userId]: {
                  username: displayUsername,
                  lineNumber: lineNumber,
                  userId: userId,
                  filename: typingFilename,
                  timestamp: Date.now(),
                },
              };
              console.log("Updated typing users:", newTypingUsers);
              return newTypingUsers;
            });

            // Set current typing user for general display
            setCurrentTypingUser(displayUsername);

            // Clear typing indicator after 3 seconds of inactivity
            setTimeout(() => {
              setTypingUsers((prev) => {
                const newTypingUsers = { ...prev };
                if (
                  newTypingUsers[userId] &&
                  Date.now() - newTypingUsers[userId].timestamp > 2800
                ) {
                  delete newTypingUsers[userId];
                }
                return newTypingUsers;
              });
            }, 3000);
          }
        }
      );

      // Listen for user stopped typing
      socket.on(
        "userStoppedTyping",
        ({ userId, filename: stoppedFilename }) => {
          console.log("User stopped typing:", userId);

          if (
            userId !== currentUserId &&
            userId !== null &&
            userId !== "null"
          ) {
            setTypingUsers((prev) => {
              const newTypingUsers = { ...prev };
              delete newTypingUsers[userId];
              console.log(
                "Removed typing user:",
                userId,
                "Remaining:",
                newTypingUsers
              );
              return newTypingUsers;
            });

            // Update current typing user
            setCurrentTypingUser((prevUser) => {
              const remainingUsers = Object.values(typingUsers);
              if (remainingUsers.length === 0) {
                return "";
              }
              return remainingUsers[0].username;
            });
          }
        }
      );

      // Cleanup on unmount
      return () => {
        if (socket) {
          socket.emit("leaveRoom", { roomId, token });
          socket.disconnect();
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      };
    }
  }, [roomId, onCodeChange]);

  const handleCodeChange = (editor, data, value) => {
    onCodeChange(value);

    if (socketRef.current && roomId) {
      socketRef.current.emit("codeChange", { roomId, code: value });
    }
  };

  const handleCursorActivity = (editor) => {
    if (!socketRef.current || !roomId) return;

    const cursor = editor.getCursor();
    const lineNumber = cursor.line + 1;
    const { userId } = getUserDataFromToken();

    // Only emit if we have valid user data
    if (!userId || userId === "null" || !currentUserName) {
      console.warn("Invalid user data, skipping typing event:", {
        userId,
        username: currentUserName,
      });
      return;
    }

    console.log("Emitting typing event:", {
      lineNumber,
      username: currentUserName,
      userId,
      roomId,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event with fetched username
    socketRef.current.emit("typing", {
      roomId,
      lineNumber,
      username: currentUserName, // Use the fetched username
      userId,
      filename: filename || "Unknown File",
    });

    // Set timeout to emit stopped typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit("stoppedTyping", {
          roomId,
          userId,
          filename: filename || "Unknown File",
        });
      }
    }, 2000);
  };

  const handleKeyPress = (editor, event) => {
    // Trigger typing indicator on key press
    handleCursorActivity(editor);
  };

  return (
    <div className="code-editor-container">
      <div className="editor-wrapper">
        <CodeMirror
          value={code}
          options={{
            mode: "javascript",
            theme: theme,
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            foldGutter: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          }}
          onBeforeChange={handleCodeChange}
          onCursorActivity={handleCursorActivity}
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* Enhanced typing indicators */}
      {(Object.keys(typingUsers).length > 0 || currentTypingUser) && (
        <div className="typing-indicators">
          {/* Show general typing indicator */}
          {currentTypingUser && (
            <div className="general-typing-indicator">
              <div className="typing-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className="typing-content">
                <span className="typing-user">{currentTypingUser}</span>
                <span className="typing-text">is typing</span>
              </div>
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* Show line-specific typing indicators */}
          {Object.values(typingUsers).map((typingUser) => (
            <div key={typingUser.userId} className="line-typing-indicator">
              <div className="line-indicator-content">
                <div className="user-info">
                  <i className="fas fa-edit"></i>
                  <strong>{typingUser.username}</strong>
                </div>
                <div className="location-info">
                  <span>Line {typingUser.lineNumber}</span>
                  {typingUser.filename && (
                    <span className="filename">in {typingUser.filename}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
