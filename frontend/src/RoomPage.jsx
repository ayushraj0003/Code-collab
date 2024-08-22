import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import FileUpload from './FileUpload';
import './styles.css';

const socket = io('http://localhost:5000');

function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('// Write your code here...');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]); // Added state to handle folders
  const [selectedFile, setSelectedFile] = useState(null);
  const [authorName, setAuthorName] = useState(null); // Changed variable name to be more descriptive
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(response.data);
        setFiles(response.data.files || []);
        setFolders(response.data.folders || []); // Initialize folders
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
  
    console.log('Selected File:', selectedFile);  // Debugging line
    
    try {
      const token = localStorage.getItem('token');
      if (selectedFile.folderPath) {
        // Handle committing changes to a file in a folder
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
        // Handle committing changes to a file not in a folder
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
  

  const handleFileClick = async (file) => {
    setSelectedFile(file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}/file/${file.filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load the latest file content into the editor
      setCode(response.data.content);

      // Fetch the author's name from the backend instead of just the ID
      const authorResponse = await axios.get(`http://localhost:5000/api/auth/${response.data.latestAuth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAuthorName(authorResponse.data.name);
    } catch (err) {
      setError('Failed to fetch the latest file version.');
    }
  };

  const handleFolderClick = async (file, folderPath = '') => {
    // Set the selected file with folderPath included
    setSelectedFile({
      ...file,
      folderPath: folderPath.startsWith('/') ? folderPath : `/${folderPath}`, // Ensure the folderPath is correctly set
    });
    
    try {
      const token = localStorage.getItem('token');
      const cleanedFolderPath = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath; // Remove leading slash if present
  
      const response = await axios.get(
        `http://localhost:5000/api/rooms/${roomId}/folder-file`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { folderPath: cleanedFolderPath, filename: file.filename },
        }
      );
      
      // Load the latest file content into the editor
      setCode(response.data.content);
  
      // Fetch the author's name from the backend
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

  // Function to render folder structure recursively
  const renderFolders = (folderData, path = '') => {
    return (
      <ul>
        {folderData && folderData.length > 0 ? (
          folderData.map((folder, index) => (
            <li key={index}>
              <strong>{folder.folderName}</strong>
              {folder.files && folder.files.length > 0 && (
                <ul>
                  {folder.files.map((file, fileIndex) => (
                    <li key={fileIndex} onClick={() => handleFolderClick(file, `${path}/${folder.folderName}`)}>
                      {file.filename}
                    </li>
                  ))}
                </ul>
              )}
              {folder.subfolders && renderFolders(folder.subfolders, `${path}/${folder.folderName}`)}
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
      <div className="room-left">
        <h1>Room: {room.roomName}</h1>
        <h2>Users in this Room:</h2>
        {room.users && room.users.length > 0 ? (
          <ul>
            {room.users.map((user) => (
              <li key={user._id}>{user.name}</li>
            ))}
          </ul>
        ) : (
          <p>No users found.</p>
        )}
        <h2>Files in this Room:</h2>
        {files.length > 0 ? (
          <ul>
            {files.map((file, index) => (
              <li key={index} onClick={() => handleFileClick(file)}>
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
        <h2>Code Editor</h2>
        <CodeEditor code={code} onCodeChange={handleCodeChange} roomId={room} />
        <button onClick={handleCommitChanges}>Commit Changes</button>

        <h2>Upload Folder</h2>
        <FileUpload roomId={roomId} />
        <p>{authorName ? `Last Edited by: ${authorName}` : 'No recent edits'}</p>
        <button onClick={handleVideoCall}>Start Video Call</button>
      </div>
    </div>
  );
}

export default RoomPage;
