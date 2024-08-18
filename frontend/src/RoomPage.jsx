import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import FileUpload from './FileUpload'; // Import FileUpload component
import './styles.css';
import { useNavigate  } from 'react-router-dom';
const socket = io('http://localhost:5000');



function RoomPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('// Write your code here...');
  const [files, setFiles] = useState([]); // State to hold the list of files
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(response.data);
        setFiles(response.data.files || []); // Set the files from the room data
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
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/rooms/${roomId}/save-code`,
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Code committed successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileClick = async (fileContent) => {
    setCode(fileContent); // Load the file content into the editor
  };

  //Video Call
  const handleVideoCall = () => {
  navigate(`/room/${roomId}/video-call`);
  };

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  return (
    <div className='room-container'>
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
              <li key={index} onClick={() => handleFileClick(file.content)}>
                {file.filename}
              </li>
            ))}
          </ul>
        ) : (
          <p>No files found.</p>
        )}
      </div>

      <div className="room-right">
        <h2>Code Editor</h2>
        <CodeEditor code={code} onCodeChange={handleCodeChange} />
        <button onClick={handleCommitChanges}>Commit Changes</button>
        <h2>Upload File</h2>
        <FileUpload roomId={roomId} /> {/* Add the file upload section */}
        <button onClick={handleVideoCall}>Start Video Call</button> {/* Video Call Button */}
      </div>
    </div>
  );
}


export default RoomPage;
