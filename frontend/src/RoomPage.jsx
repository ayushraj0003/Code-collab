import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaSignOutAlt, FaTrashAlt } from 'react-icons/fa';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import FileUpload from './FileUpload';
import Loader from './Loader'; // Import the Loader component
import TransferOwnershipModal from './TransferOwnershipModel';
import './styles.css';
import './design.css';
import RoomMembers from './RoomMembers';
import RenderFoldersComponent from './RenderFoldersComponent'

const socket = io('http://localhost:5000');

const RoomPage = () => {
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
  const [isOwner, setIsOwner] = useState(false);
  const [showModal, setShowModal] = useState(false);  
  const [owner, setowner] = useState(null);
  const [userNames, setUserNames] = useState([]); 
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
      
        const users = response.data.users; // Assuming users is an array of user objectsc
        
        const names = users.map(user => ({ id: user._id, name: user.name })); // Extract user names
        setUserNames(names); 
        
        // setowner(response.data.roomowner)
       
   

        const userResponse = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log(token)
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

    const handleBeforeUnload = () => {
      socket.emit('disconnectUser', { roomId, token: localStorage.getItem('token') });
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      document.removeEventListener('mousedown', handleClickOutside);
      socket.off('onlineUsers'); // Cleanup event listeners
      socket.off('codeUpdate');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    socket.disconnect();
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
    navigate(`/room/${roomId}/chat`);
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

  // const RenderFoldersComponent = ({ folders }) => {
  //   const [expandedFolders, setExpandedFolders] = useState({});
  
  //   // Toggle folder expansion state
  //   const handleFolderClick = (folderPath) => {
  //     setExpandedFolders((prevExpandedFolders) => ({
  //       ...prevExpandedFolders,
  //       [folderPath]: !prevExpandedFolders[folderPath], // Toggle the expansion state
  //     }));
  //   };
  
  //   // Build the folder tree from the folder paths
  //   const buildFolderTree = (folders) => {
  //     const tree = {};
  
  //     folders.forEach((folder) => {
  //       const parts = folder.path.split('/').filter(Boolean); // Split path into parts
  //       let current = tree;
  
  //       parts.forEach((part, index) => {
  //         if (!current[part]) {
  //           current[part] = { files: [], subfolders: {} };
  //         }
  
  //         if (index === parts.length - 1) {
  //           current[part].files = folder.files; // Assign files to the last part of the path
  //           current[part].folderName = folder.folderName; // Assign folder name
  //         }
  
  //         current = current[part].subfolders; // Move to the next subfolder level
  //       });
  //     });
  
  //     return tree;
  //   };
  
  //   // Render the folder tree recursively
  //   const renderTree = (node, path = '') => {
  //     return (
  //       <ul>
  //         {Object.keys(node).map((folderName, index) => {
  //           const fullPath = `${path}/${folderName}`.replace(/^\/+/, ''); // Full path to the folder
  //           const isExpanded = expandedFolders[fullPath]; // Check if the folder is expanded
  
  //           return (
  //             <li key={index}>
  //               {/* Folder Click Handler */}
  //               <span onClick={() => handleFolderClick(fullPath)}>
  //                 <img src="/images/folder.png" alt="Folder" className="folder-icon" />
  //                 <strong>{folderName}</strong>
  //               </span>
  
  //               {/* Render Subfolders and Files if Folder is Expanded */}
  //               {isExpanded && (
  //                 <>
  //                   {/* Render Files in the Current Folder */}
  //                   {node[folderName].files.length > 0 && (
  //                     <ul>
  //                       {node[folderName].files.map((file, fileIndex) => (
  //                         <li key={fileIndex} onClick={() => handleFileInFolderClick(file, fullPath)}>
  //                           <img src="/images/file.png" alt="File" className="folder-icon" />
  //                           {file.filename}
  //                         </li>
  //                       ))}
  //                     </ul>
  //                   )}
  
  //                   {/* Recursively Render Subfolders */}
  //                   {renderTree(node[folderName].subfolders, fullPath)}
  //                 </>
  //               )}
  //             </li>
  //           );
  //         })}
  //       </ul>
  //     );
  //   };
  
  //   const folderTree = buildFolderTree(folders); // Build the folder tree from the provided data
  //   // return <div>{renderTree(folderTree)}</div>; // Render the folder structure
  // };
  

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
  
  const checkRoomOwner = async () => {
    try {
      const token = localStorage.getItem('token'); // Corrected from setItem to getItem
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}/owner`, {
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
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rooms/${roomId}/change-owner/${newOwnerId}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Ownership transferred successfully. You can now leave the room.');
      setShowModal(false);
      handleLeaveRoomRequest();
    } catch (err) {
      alert('Failed to transfer ownership.');
    }
  };

  const handleLeaveRoomRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/rooms/${roomId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('You have left the room.');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to leave the room.');
    }
  };
  const handleUserClick = (user) => {
    // Logic to handle user click, e.g., show user profile
    // alert(`User clicked: ${user.name}`);
  };

  const headtoDashboard = () =>{
    navigate('/dashboard');
  }

  return (
    <div className="room-container">
        <div className="profile-container">
            <div className="room-sidebar">
                <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
                <h1>{room.roomName}</h1>
                <RoomMembers roomId={roomId} onlineUsers={onlineUsers}/>
            </div>
            <button className='dash-btn' onClick={headtoDashboard}><FaSignOutAlt /> Dashboard</button>
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
            <button onClick={handleLogout} className="logout-btn-dash">
              <FaSignOutAlt /> Logout
            </button>
            <button onClick={handleLeaveRoom} className='logout-btn-dash'>
        Leave Room
      </button>
      {showModal && (
        <TransferOwnershipModal
          members={userNames}
          onTransfer={handleTransferOwnership}
          onCancel={() => setShowModal(false)}
        />
      )}
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
                  <img src="/images/file.png" alt="File" className="folder-icon" />
                  {file.filename}
                </li>
              ))}
            </ul>
          ) : (
            <p>No files found.</p>
          )}
          <h2>Folder Structure:</h2>
          <RenderFoldersComponent folders={folders} roomId={roomId}/>
          {/* {folders.length > 0 ? renderFolders(folders) : <p>No folders available</p>} */}
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
