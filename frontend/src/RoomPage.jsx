import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function RoomPage() {
  const { roomId } = useParams(); // Get roomId from the URL
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoomUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRoom(response.data); // Set the room data including users
      } catch (err) {
        setError(err.message);
        console.error('Error fetching room data:', err);
      }
    };

    fetchRoomUsers();
  }, [roomId]);

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!room) {
    return <p>Loading room data...</p>;
  }

  return (
    <div>
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
  );
}

export default RoomPage;
