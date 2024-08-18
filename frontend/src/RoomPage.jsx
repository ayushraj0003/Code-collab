import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import CodeEditor from './CodeEditor';
import './styles.css';

const socket = io('http://localhost:5000'); // Connect to your backend

function RoomPage() {
  const { roomId } = useParams(); // Get roomId from the URL
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('// Write your code here...');

  useEffect(() => {
    // Fetch room users
    const fetchRoomUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(response.data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchRoomUsers();

    // Listen for code updates from the server
    socket.emit('joinRoom', roomId); // Join the room on the server
    socket.on('codeUpdate', (updatedCode) => {
      setCode(updatedCode);
    });

    return () => {
      socket.emit('leaveRoom', roomId); // Leave the room on component unmount
    };
  }, [roomId]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit('codeChange', { roomId, code: newCode }); // Send updated code to the server
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
      </div>

      <div className="room-right">
        <h2>Code Editor</h2>
        <CodeEditor code={code} onCodeChange={handleCodeChange} />
        <button onClick={handleCommitChanges}>Commit Changes</button>
      </div>
    </div>
  );
}

export default RoomPage;
