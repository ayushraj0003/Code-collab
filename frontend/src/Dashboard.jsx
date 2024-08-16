import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found. Please log in.');

        const response = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching user details:', err);
      }
    };
    fetchUserDetails();
  }, []);

  const createRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Creating room with name:', roomName);
      const response = await axios.post(
        'http://localhost:5000/api/rooms/create',
        { roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Room created successfully with ID: ${response.data.roomId}`);
    } catch (err) {
      setError(err.message);
      console.error('Error creating room:', err);
    }
  };

  const joinRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/rooms/join',
        { roomId: roomIdToJoin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Successfully joined the room: ${response.data.room.roomName}`);
    } catch (err) {
      setError(err.message);
      console.error('Error joining room:', err);
    }
  };

  const handleRoomNameChange = (e) => setRoomName(e.target.value);
  const handleRoomIdChange = (e) => setRoomIdToJoin(e.target.value);

  return (
    <>
      <div>
        <h1>Dashboard</h1>
        {error ? <p>Error: {error}</p> : userDetails && (
          <div>
            <p>Welcome, {userDetails.name}</p>
            <p>Email: {userDetails.email}</p>
          </div>
        )}
      </div>
      <div>
        <input
          type="text"
          placeholder="Enter Room Name"
          value={roomName}
          onChange={handleRoomNameChange}
        />
        <button onClick={createRoom}>Create a Room</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomIdToJoin}
          onChange={handleRoomIdChange}
        />
        <button onClick={joinRoom}>Join a Room</button>
      </div>
    </>
  );
}

export default Dashboard;
