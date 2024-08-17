import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './styles.css';

function Dashboard() {
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [roomIdToJoin, setRoomIdToJoin] = useState('');

  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const fetchUserDetailsAndRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found. Please log in.');

        const userResponse = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(userResponse.data);

        const roomsResponse = await axios.get('http://localhost:5000/api/rooms/my-rooms', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms(roomsResponse.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      }
    };
    fetchUserDetailsAndRooms();
  }, []);

  const createRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/rooms/create',
        { roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Room created successfully with ID: ${response.data.roomId}`);
      setRooms([...rooms, { roomId: response.data.roomId, roomName }]);
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
      setRooms([...rooms, response.data.room]);
    } catch (err) {
      setError(err.message);
      console.error('Error joining room:', err);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/rooms/${roomId}`); // Navigate to RoomPage with the roomId
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>
      {error ? (
        <p className="error">Error: {error}</p>
      ) : (
        userDetails && (
          <div>
            <p className="dashboard-welcome">Welcome, {userDetails.name}</p>
            <p className="dashboard-email">Email: {userDetails.email}</p>
          </div>
        )
      )}
      <div>
        <input
          type="text"
          placeholder="Enter Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <button onClick={createRoom}>Create a Room</button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomIdToJoin}
          onChange={(e) => setRoomIdToJoin(e.target.value)}
        />
        <button onClick={joinRoom}>Join a Room</button>
      </div>
      <div>
        <h2>My Rooms</h2>
        <div className="rooms-list">
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <div
                key={room.roomId}
                className="room-card"
                onClick={() => handleRoomClick(room.roomId)} // Navigate to the RoomPage on click
              >
                <h3>{room.roomName}</h3>
                <p>Room ID: {room.roomId}</p>
              </div>
            ))
          ) : (
            <p>No rooms found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
