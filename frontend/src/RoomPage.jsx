import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FaSignOutAlt, FaTrashAlt } from "react-icons/fa";
import io from "socket.io-client";
import FileUpload from "./FileUpload";
import Loader from "./Loader";
import TransferOwnershipModal from "./TransferOwnershipModel";
import "./styles.css";
import "./design.css";
import "./RoomPage.css";
import RoomMembers from "./RoomMembers";
import RenderFoldersComponent from "./RenderFoldersComponent";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const socket = io(`${API_URL}`);

const RoomPage = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState("// Write your code here...");
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [authorName, setAuthorName] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true); // State for loading
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [owner, setowner] = useState(null);
  const [userNames, setUserNames] = useState([]);
  const [isUploadSliderOpen, setIsUploadSliderOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  const navigate = useNavigate();

  useEffect(
    () => {
      const fetchRoomData = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          const users = response.data.users; // Assuming users is an array of user objectsc

          const names = users.map((user) => ({
            id: user._id,
            name: user.name,
          })); // Extract user names
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
          setLoading(false); // Stop loading once data is fetched
        }
      };

      fetchRoomData();

      socket.emit("joinRoom", { roomId, token: localStorage.getItem("token") });
      socket.on("onlineUsers", (users) => {
        setOnlineUsers(users);
      });

      socket.on("codeUpdate", (updatedCode) => {
        setCode(updatedCode);
      });
      const handleClickOutside = (event) => {
        // Check if the click is outside the dropdown and the avatar
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
        socket.off("onlineUsers"); // Cleanup event listeners
        socket.off("codeUpdate");
        window.removeEventListener("beforeunload", handleBeforeUnload);
        socket.disconnect();
      };
    },
    [roomId],
    [files],
    [folders]
  );

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
    setOpenProfile(false); // Close the dropdown when the modal opens
  };

  const toggleProfile = () => {
    setOpenProfile(!openProfile);
  };

  const handleLogout = () => {
    socket.emit("logout", { roomId, token: localStorage.getItem("token") });
    // socket.disconnect();
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
        navigate("/dashboard"); // Redirect to the home or another page after deletion
      } catch (err) {
        alert("Failed to delete the room");
      }
    }
  };

  const checkRoomOwner = async () => {
    try {
      const token = localStorage.getItem("token"); // Corrected from setItem to getItem
      const response = await axios.get(`${API_URL}/api/rooms/${roomId}/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data.owner; // Return the owner status
    } catch (error) {
      console.error("Error checking room ownership:", error);
      return false; // Return false in case of error
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
  const handleUserClick = (user) => {};

  const headtoDashboard = () => {
    navigate("/dashboard");
  };

  const toggleUploadSlider = () => {
    setIsUploadSliderOpen(!isUploadSliderOpen);
  };

  // Close slider with Escape key
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

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (loading) {
    return <Loader />; // Show loader while fetching data
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  return (
    <div className="room-container">
      <div className="profile-container">
        <div className="room-sidebar">
          <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
          <h1>{room.roomName}</h1>
          <RoomMembers roomId={roomId} onlineUsers={onlineUsers} />
        </div>
        <button className="dash-btn" onClick={headtoDashboard}>
          <FaSignOutAlt /> Dashboard
        </button>
        <button className="chat-btn" onClick={handleGroupChatRedirect}>
        <FaSignOutAlt /> Chat
      </button>
      </div>

      <div className="mains-content">
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
