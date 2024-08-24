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
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isCreateRoomVisible, setIsCreateRoomVisible] = useState(false);
  const [isJoinRoomVisible, setIsJoinRoomVisible] = useState(false);

  const [roomBackgroundImages, setRoomBackgroundImages] = useState({}); // Store background images for rooms

  const navigate = useNavigate();

  const backgroundImages = [
    '/images/bg1.jpg',
    '/images/bg2.jpg',
    '/images/bg3.jpg',
    '/images/bg4.jpg',
    '/images/bg5.jpg',
    '/images/bg6.jpg',
    '/images/bg7.jpg',
    '/images/bg8.jpg',
    // Add more image paths
  ];

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

        const roomsData = roomsResponse.data;

        // Assign random background images to each room
        const initialBackgroundImages = {};
        roomsData.forEach((room) => {
          initialBackgroundImages[room.roomId] = getRandomBackgroundImage();
        });

        setRoomBackgroundImages(initialBackgroundImages);
        setRooms(roomsData);
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
      setRooms([...rooms, { roomId: response.data.roomId, roomName }]);
      setCreatedRoomId(response.data.roomId);
      setRoomName('');
      setIsCreateRoomVisible(false);
      setShowSuccessMessage(true);
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

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
    setShowSuccessMessage(false); // Collapse the success message and button
  };

  // Function to get a random image URL
  const getRandomBackgroundImage = () => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  };

  return (
    <div className="dashboard-container">
      <div className="profile-container">
        <img src="/images/logo2.png" alt="Logo" className="dash-logo" />
        <div className="profile-content">
          {error ? (
            <p className="error">Error: {error}</p>
          ) : (
            userDetails && (
              <div>
                <p className="dashboard-welcome">Welcome, {userDetails.name}</p>
                <p className="dashboard-email">Email: {userDetails.email}</p>
                <img src={userDetails.avatar} alt="User Avatar" className="user-avatar" />
              </div>
            )
          )}
        </div>
      </div>
      <div className="main-content">
        <h1>Dashboard</h1>
        <div className="dash">
          <div className='create-container'>
            <button
              onClick={() => setIsCreateRoomVisible(!isCreateRoomVisible)}
              className="create-btn"
            >
              {isCreateRoomVisible ? 'Cancel Create Room' : 'Create Room'}
            </button>
            {isCreateRoomVisible && (
              <div className="form-container visible">
                <input
                  type="text"
                  placeholder="Enter Room Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
                <button onClick={createRoom}>Create Room</button>
              </div>
            )}
            {showSuccessMessage && (
              <div className="copy-room-id">
                <p>Room created successfully with ID: {createdRoomId}</p>
                <button onClick={handleCopyRoomId}>Copy Room ID</button>
              </div>
            )}
          </div>

          <div className='join-container'>
            <button
              onClick={() => setIsJoinRoomVisible(!isJoinRoomVisible)}
              className="join-btn"
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
        </div>
        <div className="room-containers">
          <h1>My Rooms</h1>
          <div className="rooms-list">
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.roomId}
                  className="room-card"
                  onClick={() => handleRoomClick(room.roomId)}
                  style={{ backgroundImage: `url(${roomBackgroundImages[room.roomId]})` }} // Use the stored background image
                >
                  <div className="room-info">
                    <h3>{room.roomName}</h3>
                    <p>{room.roomId}</p>
                  </div>
                </div>
              ))
            ) : (
              <p>No rooms found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
