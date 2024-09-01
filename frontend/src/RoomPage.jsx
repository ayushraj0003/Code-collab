import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaSignOutAlt, FaTrashAlt } from 'react-icons/fa';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import FileUpload from './FileUpload';
import Loader from './Loader'; // Import the Loader component
import ManageRoomUsers from './ManageRoomUsers';
import './styles.css';
import './design.css';

const socket = io('http://localhost:5000');

function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('// Write your code here...');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [authorName, setAuthorName] = useState(null);
  const [repoUrl, setRepoUrl] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true); // State for loading
  const [isModalOpen, setIsModalOpen] = useState(false);  
  const [openProfile, setOpenProfile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userResponse = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
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

    socket.emit('joinRoom', { roomId, token: localStorage.getItem('token') });
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('codeUpdate', (updatedCode) => {
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
    document.addEventListener('mousedown', handleClickOutside);
  

    return () => {
socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      document.removeEventListener('mousedown', handleClickOutside);
      socket.off('onlineUsers'); // Cleanup event listeners
      socket.off('codeUpdate');
    };

  }, [roomId],[files],[folders]);
  // const handleDeleteRoom = async () => {
  //   if (window.confirm('Are you sure you want to delete this room?')) {
  //     try {
  //       const token = localStorage.getItem('token');
  //       console.log(token);
  //       await axios.delete(`http://localhost:5000/api/rooms/delete/${roomId}`, {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  
  //       alert('Room deleted successfully');
  //       navigate('/'); // Redirect to the home or another page after deletion
  //     } catch (err) {
  //       alert('Failed to delete the room');
  //     }
  //   }
  // };
  
  useEffect(() => {
    console.log("Updated online users:", onlineUsers);
  }, [onlineUsers]);
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit('codeChange', { roomId, code: newCode });
  };

  const handleCommitChanges = async () => {
    if (!selectedFile) {
      alert('Please select a file to commit changes.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (selectedFile.folderPath) {
        const cleanedFolderPath = selectedFile.folderPath.startsWith('/') ? selectedFile.folderPath.slice(1) : selectedFile.folderPath;
        await axios.post(
          `http://localhost:5000/api/rooms/${roomId}/commit-folder-file`,
          {
            folderPath: cleanedFolderPath,
            filename: selectedFile.filename,
            newContent: code,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `http://localhost:5000/api/rooms/${roomId}/commit`,
          { filename: selectedFile.filename, newContent: code },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      alert('Code committed successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRepoUrlSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/rooms/${roomId}/github-upload`, {
        repoUrl,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFiles(response.data.files);
      setFolders(response.data.folders);
      alert('Files uploaded successfully from GitHub repository!');
    } catch (err) {
      alert('Failed to upload files from GitHub repository.');
    }
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}/file/${file.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCode(response.data.content);

      const authorResponse = await axios.get(`http://localhost:5000/api/auth/${response.data.latestAuth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAuthorName(authorResponse.data.name);
    } catch (err) {
      setError('Failed to fetch the latest file version.');
    }
  };

  const handleFolderClick = async (folderIndex) => {
    setFolders(prevFolders =>
      prevFolders.map((folder, index) =>
        index === folderIndex
          ? { ...folder, isOpen: !folder.isOpen }
          : folder
      )
    );
  };
  const handleGroupChatRedirect = () => {
    navigate(`/room/${roomId}/group-chat`);
  };

  const handleFileInFolderClick = async (file, folderPath = '') => {
    setSelectedFile({
      ...file,
      folderPath: folderPath.startsWith('/') ? folderPath : `/${folderPath}`,
    });

    try {
      const token = localStorage.getItem('token');
      const cleanedFolderPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;

      const response = await axios.get(
        `http://localhost:5000/api/rooms/${roomId}/folder-file`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { folderPath: cleanedFolderPath, filename: file.filename },
        }
      );

      setCode(response.data.content);

      const authorResponse = await axios.get(`http://localhost:5000/api/auth/${response.data.latestAuth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAuthorName(authorResponse.data.name);
    } catch (err) {
      setError('Failed to fetch the latest file version.');
    }
  };

  const handleVideoCall = () => {
    navigate(`/room/${roomId}/video-call`);
  };

  const renderFolders = (folders) => {
    const buildFolderTree = (folders) => {
      const tree = {};
  
      folders.forEach((folder) => {
        const parts = folder.path.split('/').filter(Boolean); // Split path into parts
        let current = tree;
  
        parts.forEach((part, index) => {
          if (!current[part]) {
            current[part] = { files: [], subfolders: {} };
          }
  
          if (index === parts.length - 1) {
            current[part].files = folder.files; // Assign files to the last part of the path
          }
  
          current = current[part].subfolders; // Move to the next subfolder level
        });
      });
  
      return tree;
    };
  
    const renderTree = (node, path = '') => {
      return (
        <ul>
          {Object.keys(node).map((folderName, index) => (
            <li key={index}>
              <span onClick={() => handleFolderClick(folderName)}>
                <img src="/images/folder.png" alt="Folder" className="folder-icon" />
                <strong>{folderName}</strong>
              </span>
              {node[folderName].files.length > 0 && (
                <ul>
                  {node[folderName].files.map((file, fileIndex) => (
                    <li key={fileIndex} onClick={() => handleFileInFolderClick(file, `${path}/${folderName}`)}>
                      <img src="/images/file.png" alt="File" className="folder-icon" />
                      {file.filename}
                    </li>
                  ))}
                </ul>
              )}
              {renderTree(node[folderName].subfolders, `${path}/${folderName}`)}
            </li>
          ))}
        </ul>
      );
    };
  
    const folderTree = buildFolderTree(folders);
    return renderTree(folderTree);
  };
  

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (loading) {
    return <Loader />; // Show loader while fetching data
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
    setOpenProfile(false); // Close the dropdown when the modal opens
  };

  const toggleProfile = () =>{
    setOpenProfile(!openProfile);
  }

const handleLogout = () => {
    socket.emit('logout', { roomId, token: localStorage.getItem('token')});
    // socket.disconnect();
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleDeleteRoom = async () => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:5000/api/rooms/delete/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        alert('Room deleted successfully');
        navigate('/dashboard'); // Redirect to the home or another page after deletion
      } catch (err) {
        alert('Failed to delete the room');
      }
    }
  };
  
  return (
    <div className="room-container">
        <div className="profile-container">
            <div className="room-sidebar">
                <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
                <h1>{room.roomName}</h1>
                <ManageRoomUsers roomId={roomId} onlineUsers={onlineUsers} />
              
            </div>
        </div>

      <div className="main-content">
        <div className="room-content">
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
            <span onClick={toggleModal}>Profile</span>
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
            {room.userId === userDetails?._id && ( 
              <button className="header-button" onClick={handleDeleteRoom}>
                <FaTrashAlt /> Delete Room
              </button>
            )}
          </div>
        </div>
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
          <h2>Files in this Room:</h2>
          {files.length > 0 ? (
            <ul>
              {files.map((file, index) => (
                <li key={index} onClick={() => handleFileClick(file)}>
                  <img src="/images/file.jpg" alt="File" />
                  {file.filename}
                </li>
              ))}
            </ul>
          ) : (
            <p>No files found.</p>
          )}
          <h2>Folder Structure:</h2>
          {folders.length > 0 ? renderFolders(folders) : <p>No folders available</p>}
        </div>
        
        <div className="room-right">
          <button onClick={handleCommitChanges}>Commit Changes</button>

          <h2>Upload Folder</h2>
          <FileUpload roomId={roomId} />
          <p>{authorName ? `Last Edited by: ${authorName}` : 'No recent edits'}</p>
          <button onClick={handleVideoCall}>Start Video Call</button>
          <div className="github-repo-upload">
            <h2>Upload Files from GitHub</h2>
            <input 
              type="text" 
              placeholder="Enter GitHub repo URL" 
              value={repoUrl} 
              onChange={(e) => setRepoUrl(e.target.value)} 
            />
            <button onClick={handleRepoUrlSubmit}>Upload from GitHub</button>
            
              
            <button onClick={handleGroupChatRedirect}>
          Go to Group Chat
        </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
