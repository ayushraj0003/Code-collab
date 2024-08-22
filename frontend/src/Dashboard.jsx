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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCreateRoomVisible, setIsCreateRoomVisible] = useState(false);
  const [isJoinRoomVisible, setIsJoinRoomVisible] = useState(false);

  const navigate = useNavigate();

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
      setRoomName('');
      setIsCreateRoomVisible(false);
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
      setRoomIdToJoin('');
      setIsJoinRoomVisible(false);
    } catch (err) {
      setError(err.message);
      console.error('Error joining room:', err);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  return (
    <div className="dashboard-container">
      <div className={`profile ${isSidebarOpen ? 'open' : 'closed'}`}>
        {isSidebarOpen && (
          <div className="profile-content">
            {error ? (
              <p className="error">Error: {error}</p>
            ) : (
              userDetails && (
                <div>
                  <p className="dashboard-welcome">Welcome, {userDetails.name}</p>
                  <p className="dashboard-email">Email: {userDetails.email}</p>
                  <img src={userDetails.avatar} alt="User Avatar" className="avatar" />
                </div>
              )
            )}
          </div>
        )}
      </div>
      <div className='r'>
        <div className={`dash ${isSidebarOpen ? '' : 'expanded'}`}>
          <button
            onClick={() => setIsCreateRoomVisible(!isCreateRoomVisible)}
            className="createjoin"
          >
            {isCreateRoomVisible ? 'Cancel Create Room' : 'Create Room'}
          </button>
          <div className={`form-container ${isCreateRoomVisible ? 'visible' : ''}`}>
            <input
              type="text"
              placeholder="Enter Room Name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button onClick={createRoom}>Create Room</button>
          </div>

          <button
            onClick={() => setIsJoinRoomVisible(!isJoinRoomVisible)}
            className="createjoin"
          >
            {isJoinRoomVisible ? 'Cancel Join Room' : 'Join Room'}
          </button>
          <div className={`form-container ${isJoinRoomVisible ? 'visible' : ''}`}>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
            />
            <button onClick={joinRoom}>Join Room</button>
          </div>
        </div>
        <div className='room-containers'>
          <h2>My Rooms</h2>
          <div className="rooms-list">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.roomId}
                  className="room-card"
                  onClick={() => handleRoomClick(room.roomId)}
                >
                  <h3>{room.roomName}</h3>
                  <p>Room ID: {room.roomId}</p>
                </div>
              ))
            ) : (
              <p>No rooms found.</p>
            )}
          </div>
          <button onClick={toggleSidebar} className='btn'>
            {isSidebarOpen ? 'Close Profile' : 'Open Profile'}
          </button>
        </div>
      </div>




    </div>
  );
}

export default Dashboard;
