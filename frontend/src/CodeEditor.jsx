import React, { useEffect, useState, useRef, useCallback } from "react";
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
  const userDataRef = useRef({ userId: null, token: null });
  const isConnectedRef = useRef(false);

  // Function to decode user data from JWT token
  const getUserDataFromToken = useCallback(() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found in localStorage");
        return { userId: null, token: null };
      }

      // Decode JWT token to get user information
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        userId: payload.userId || payload.id || payload.sub,
        token: token,
      };
    } catch (error) {
      console.error("Error decoding token:", error);
      return { userId: null, token: localStorage.getItem("token") };
    }
  }, []);

  const fetchUserName = useCallback(async (userId) => {
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
  }, []);

  // Debounced typing handler
  const handleTypingEvent = useCallback(
    (lineNumber) => {
      if (!socketRef.current || !roomId || !isConnectedRef.current) return;

      const { userId } = userDataRef.current;

      if (!userId || userId === "null" || !currentUserName) {
        console.warn("Invalid user data, skipping typing event");
        return;
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Emit typing event
      socketRef.current.emit("typing", {
        roomId,
        lineNumber,
        username: currentUserName,
        userId,
        filename: filename || "Unknown File",
      });

      // Set timeout to emit stopped typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && isConnectedRef.current) {
          socketRef.current.emit("stoppedTyping", {
            roomId,
            userId,
            filename: filename || "Unknown File",
          });
        }
      }, 2000);
    },
    [roomId, currentUserName, filename]
  );

  useEffect(() => {
    if (!roomId) return;

    // Get user data once
    const userData = getUserDataFromToken();
    userDataRef.current = userData;

    if (!userData.token || !userData.userId) {
      console.error("No valid token or userId available");
      return;
    }

    // Initialize socket connection only once
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        forceNew: true,
        transports: ["websocket", "polling"],
      });
    }

    const socket = socketRef.current;

    // Fetch current user's name
    fetchUserName(userData.userId).then((userName) => {
      setCurrentUserName(userName);
    });

    // Socket event handlers
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      isConnectedRef.current = true;
      // Join the room after connection
      socket.emit("joinRoom", { roomId, token: userData.token });
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      isConnectedRef.current = false;
    };

    const handleRoomJoined = (data) => {
      console.log("Successfully joined room:", data);
    };

    const handleCodeUpdate = (updatedCode) => {
      onCodeChange(updatedCode);
    };

    const handleUserTyping = async ({
      lineNumber,
      username: typingUsername,
      userId,
      filename: typingFilename,
    }) => {
      // Don't show typing indicator for current user
      if (userId !== userData.userId && userId !== null && userId !== "null") {
        let displayUsername = typingUsername;
        if (!typingUsername || typingUsername === "Unknown User") {
          displayUsername = await fetchUserName(userId);
        }

        setTypingUsers((prev) => ({
          ...prev,
          [userId]: {
            username: displayUsername,
            lineNumber: lineNumber,
            userId: userId,
            filename: typingFilename,
            timestamp: Date.now(),
          },
        }));

        setCurrentTypingUser(displayUsername);

        // Auto-clear typing indicator
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
    };

    const handleUserStoppedTyping = ({ userId }) => {
      if (userId !== userData.userId && userId !== null && userId !== "null") {
        setTypingUsers((prev) => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[userId];
          return newTypingUsers;
        });

        // Update current typing user
        setCurrentTypingUser((prevUser) => {
          const remainingUsers = Object.values(typingUsers);
          return remainingUsers.length > 0 ? remainingUsers[0].username : "";
        });
      }
    };

    // Add event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("roomJoined", handleRoomJoined);
    socket.on("codeUpdate", handleCodeUpdate);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);

    // If already connected, join room immediately
    if (socket.connected) {
      handleConnect();
    }

    // Cleanup function
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Remove event listeners
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("roomJoined", handleRoomJoined);
      socket.off("codeUpdate", handleCodeUpdate);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);

      // Leave room and disconnect
      if (socket.connected) {
        socket.emit("leaveRoom", { roomId, token: userData.token });
      }

      isConnectedRef.current = false;
    };
  }, [roomId, onCodeChange, fetchUserName, getUserDataFromToken]);

  const handleCodeChange = useCallback(
    (editor, data, value) => {
      onCodeChange(value);

      if (socketRef.current && roomId && isConnectedRef.current) {
        socketRef.current.emit("codeChange", { roomId, code: value });
      }
    },
    [onCodeChange, roomId]
  );

  const handleCursorActivity = useCallback(
    (editor) => {
      const cursor = editor.getCursor();
      const lineNumber = cursor.line + 1;
      handleTypingEvent(lineNumber);
    },
    [handleTypingEvent]
  );

  const handleKeyPress = useCallback(
    (editor, event) => {
      handleCursorActivity(editor);
    },
    [handleCursorActivity]
  );

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
