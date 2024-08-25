import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import FileUpload from './FileUpload';
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
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(response.data);
        setFiles(response.data.files || []);
        setFolders(response.data.folders || []); 
      } catch (err) {
        setError(err.message);
      }
    };

    fetchRoomData();

    socket.emit('joinRoom', roomId);
    socket.on('codeUpdate', (updatedCode) => {
      setCode(updatedCode);
    });

    return () => {
      socket.emit('leaveRoom', roomId);
    };
  }, [roomId]);

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
  
      // Update the files and folders in the room with the new ones from GitHub
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

  const renderFolders = (folderData, path = '') => {
    return (
      <ul>
        {folderData && folderData.length > 0 ? (
          folderData.map((folder, index) => (
            <li key={index}>
              <span onClick={() => handleFolderClick(index)}>
                <img src="/images/folder.png" alt="Folder" className="folder-icon" />
                <strong>{folder.folderName}</strong>
              </span>
              {folder.isOpen && folder.files && folder.files.length > 0 && (
                <ul>
                  {folder.files.map((file, fileIndex) => (
                    <li key={fileIndex} onClick={() => handleFileInFolderClick(file, `${path}/${folder.folderName}`)}>
                      <img src="/images/file.png" alt="File" className="folder-icon" />
                      {file.filename}
                    </li>
                  ))}
                </ul>
              )}
              {folder.isOpen && folder.subfolders && renderFolders(folder.subfolders, `${path}/${folder.folderName}`)}
            </li>
          ))
        ) : (
          <p>No folders available</p>
        )}
      </ul>
    );
  };

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  return (
    <div className="room-container">
      <div className="profile-container">
        <div className="room-sidebar">
          <img src="/images/logo2.png" alt="Logo" className="dash-logo" />
          <h1>{room.roomName}</h1>
          <h3>Members:</h3>
          {room.users && room.users.length > 0 ? (
            <ul>
              {room.users.map((user) => (
                <p key={user._id}>
                  <img src={user.avatar} alt={user.name} className="member-avatar" />
                  {user.name}
                </p>
              ))}
            </ul>
          ) : (
            <p>No users found.</p>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="room-content">
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
          {renderFolders(folders)}
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
</div>
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
