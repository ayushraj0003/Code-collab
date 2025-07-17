import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaSignOutAlt, FaTrashAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa"; // Add chevron icons
import io from "socket.io-client";
import FileUpload from "./FileUpload";
import Loader from "./Loader";
import TransferOwnershipModal from "./TransferOwnershipModel";
import "./styles.css";
import "./design.css";
import "./RoomPage.css";
import RoomMembers from "./RoomMembers";
import RenderFoldersComponent from "./RenderFoldersComponent";
import useRoomAccess from "./hooks/useRoomAccess";
// Fixed import path - changed from ./components/AccessDenied to ./AccessDenied
import AccessDenied from "./Components/AccessDenied";
import LoadingSpinner from "./Loader";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const socket = io(`${API_URL}`);

const RoomPage = () => {
  const { roomId } = useParams();
  const {
    isLoading,
    hasAccess,
    roomData,
    error: accessError, // Renamed to avoid conflict
    retryAccess,
  } = useRoomAccess(roomId);
  
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState("// Write your code here...");
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [authorName, setAuthorName] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [owner, setowner] = useState(null);
  const [userNames, setUserNames] = useState([]);
  const [isUploadSliderOpen, setIsUploadSliderOpen] = useState(false);
  // Add state for sidebar visibility
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  // Add error state that was missing
  const [error, setError] = useState(null);

  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const users = response.data.users;

        const names = users.map((user) => ({
          id: user._id,
          name: user.name,
        }));
        setUserNames(names);
        
        const userResponse = await axios.get(`${API_URL}/api/auth/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log(token);
        setUserDetails(userResponse.data);
        setRoom(response.data);
        setFiles(response.data.files || []);
        setFolders(response.data.folders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch room data if access is verified
    if (hasAccess && !isLoading) {
      fetchRoomData();

      socket.emit("joinRoom", { roomId, token: localStorage.getItem("token") });
      socket.on("onlineUsers", (users) => {
        setOnlineUsers(users);
      });

      socket.on("codeUpdate", (updatedCode) => {
        setCode(updatedCode);
      });
      
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          avatarRef.current &&
          !avatarRef.current.contains(event.target)
        ) {
          setOpenProfile(false);
        }
      };
      
      document.addEventListener("mousedown", handleClickOutside);

      const handleBeforeUnload = () => {
        socket.emit("disconnectUser", {
          roomId,
          token: localStorage.getItem("token"),
        });
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      
      return () => {
        socket.emit("leaveRoom", {
          roomId,
          token: localStorage.getItem("token"),
        });
        document.removeEventListener("mousedown", handleClickOutside);
        socket.off("onlineUsers");
        socket.off("codeUpdate");
        window.removeEventListener("beforeunload", handleBeforeUnload);
        socket.disconnect();
      };
    }
  }, [roomId, hasAccess, isLoading]);

  useEffect(() => {
    console.log("Updated online users:", onlineUsers);
  }, [onlineUsers]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/rooms/${roomId}/file/${file.filename}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCode(response.data.content);

      const authorResponse = await axios.get(
        `${API_URL}/api/auth/${response.data.latestAuth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAuthorName(authorResponse.data.name);
    } catch (err) {
      setError("Failed to fetch the latest file version.");
    }
  };

  const handleFolderClick = async (folderIndex) => {
    setFolders((prevFolders) =>
      prevFolders.map((folder, index) =>
        index === folderIndex ? { ...folder, isOpen: !folder.isOpen } : folder
      )
    );
  };

  const handleGroupChatRedirect = () => {
    navigate(`/room/${roomId}/chat`);
  };

  const handleFileInFolderClick = async (file, folderPath = "") => {
    setSelectedFile({
      ...file,
      folderPath: folderPath.startsWith("/") ? folderPath : `/${folderPath}`,
    });

    try {
      const token = localStorage.getItem("token");
      const cleanedFolderPath = folderPath.startsWith("/")
        ? folderPath.slice(1)
        : folderPath;

      const response = await axios.get(
        `${API_URL}/api/rooms/${roomId}/folder-file`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { folderPath: cleanedFolderPath, filename: file.filename },
        }
      );

      setCode(response.data.content);

      const authorResponse = await axios.get(
        `${API_URL}/api/auth/${response.data.latestAuth}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAuthorName(authorResponse.data.name);
    } catch (err) {
      setError("Failed to fetch the latest file version.");
    }
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setOpenProfile(false);
  };

  const toggleProfile = () => {
    setOpenProfile(!openProfile);
  };

  // Add toggle sidebar function
  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  const handleLogout = () => {
    socket.emit("logout", { roomId, token: localStorage.getItem("token") });
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleDeleteRoom = async () => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/rooms/delete/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        alert("Room deleted successfully");
        navigate("/dashboard");
      } catch (err) {
        alert("Failed to delete the room");
      }
    }
  };

  const checkRoomOwner = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/rooms/${roomId}/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.owner;
    } catch (error) {
      console.error("Error checking room ownership:", error);
      return false;
    }
  };

  const handleLeaveRoom = async () => {
    const isOwner = await checkRoomOwner();
    if (isOwner) {
      setShowModal(true);
    } else {
      handleLeaveRoomRequest();
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/change-owner/${newOwnerId}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Ownership transferred successfully. You can now leave the room.");
      setShowModal(false);
      handleLeaveRoomRequest();
    } catch (err) {
      alert("Failed to transfer ownership.");
    }
  };

  const handleLeaveRoomRequest = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/rooms/${roomId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("You have left the room.");
      navigate("/dashboard");
    } catch (err) {
      alert("Failed to leave the room.");
    }
  };

  const headtoDashboard = () => {
    navigate("/dashboard");
  };

  const toggleUploadSlider = () => {
    setIsUploadSliderOpen(!isUploadSliderOpen);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && isUploadSliderOpen) {
        setIsUploadSliderOpen(false);
      }
    };

    if (isUploadSliderOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUploadSliderOpen]);

  // Show loading while verifying access
  if (isLoading) {
    return (
      <div className="room-container">
        <LoadingSpinner message="Verifying room access..." />
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasAccess) {
    return (
      <AccessDenied
        error={accessError}
        onRetry={retryAccess}
        showRetry={true}
      />
    );
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (loading) {
    return <Loader />;
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  return (
    <div className="room-container">
      {/* Enhanced Profile Container with Retractable Sidebar */}
      <div className={`profile-container ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        {/* Sidebar Toggle Button */}
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isSidebarVisible ? <FaChevronLeft /> : <FaChevronRight />}
        </button>

        <div className="room-sidebar">
          <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
          <h1>{room.roomName}</h1>
          <RoomMembers roomId={roomId} onlineUsers={onlineUsers} />
        </div>

        {/*    Buttons */}
        <button className="dash-btn" onClick={headtoDashboard}>
          <FaSignOutAlt /> Dashboard
        </button>
        <button className="chat-btn" onClick={handleGroupChatRedirect}>
          <FaSignOutAlt /> Chat
        </button>
      </div>

      {/* Floating Sidebar Toggle Button (when sidebar is hidden) */}
      {!isSidebarVisible && (
        <button className="sidebar-toggle-floating" onClick={toggleSidebar}>
          <FaChevronRight />
        </button>
      )}

      {/* Main Content Area */}
      <div className={`mains-content ${!isSidebarVisible ? 'expanded' : ''}`}>
        {/* User Avatar - Top Right */}
        <div className="user-avatar-room">
          {error ? (
            <p className="error">Error: {error}</p>
          ) : (
            userDetails && (
              <img
                src={userDetails.avatar}
                alt="User Avatar"
                className="user-avatar-logo"
                onClick={toggleProfile}
                ref={avatarRef}
              />
            )
          )}
          {openProfile && (
            <div className="profile-options" ref={dropdownRef}>
              <div className="profile-selections">
                <span onClick={toggleModal}>👤 Profile</span>
                <button onClick={handleLogout} className="logout-btn-dash">
                  <FaSignOutAlt /> Logout
                </button>
                <button onClick={handleLeaveRoom} className="logout-btn-dash">
                  🚪 Leave Room
                </button>
                {room.userId === userDetails?._id && (
                  <button className="header-button" onClick={handleDeleteRoom}>
                    <FaTrashAlt /> Delete Room
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="room-content">
          <div className="room-left">
            <div className="folder-structure-section">
              <h2>Folder Structure</h2>
              <RenderFoldersComponent folders={folders} roomId={roomId} />
            </div>
          </div>
        </div>

        {/* Upload Button - Bottom Right */}
        <div className="upload-button-container">
          <button
            className="upload-trigger-btn"
            onClick={toggleUploadSlider}
            title="Upload Files"
          >
            📤 Upload
          </button>
        </div>

        {/* Upload Slider Backdrop */}
        {isUploadSliderOpen && (
          <div
            className="upload-slider-backdrop"
            onClick={() => setIsUploadSliderOpen(false)}
          />
        )}

        {/* Upload Slider */}
        <div className={`upload-slider ${isUploadSliderOpen ? "open" : ""}`}>
          <div className="upload-slider-header">
            <h2>📤 File & Folder Upload</h2>
            <button
              className="upload-slider-close"
              onClick={() => setIsUploadSliderOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="upload-slider-content">
            <FileUpload roomId={roomId} />
          </div>
        </div>

        {/* Existing modals */}
        {showModal && (
          <TransferOwnershipModal
            members={userNames}
            onTransfer={handleTransferOwnership}
            onCancel={() => setShowModal(false)}
          />
        )}

        {isModalOpen && (
          <div className="modal">
            <div className="modal-content">
              <span className="close" onClick={toggleModal}>
                &times;
              </span>
              <h2>User Details</h2>
              {userDetails && (
                <>
                  <p>
                    <strong>Name:</strong> {userDetails.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {userDetails.email}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {userDetails.mobile}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;