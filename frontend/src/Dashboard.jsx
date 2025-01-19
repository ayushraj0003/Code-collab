import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './styles.css';
import { FaSearch, FaTimes, FaSignOutAlt } from 'react-icons/fa'; // Import the logout icon

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
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filteredRooms, setFilteredRooms] = useState([]); 
  const [roomBackgroundImages, setRoomBackgroundImages] = useState({}); 
  const [isModalOpen, setIsModalOpen] = useState(false);  

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
  ];

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchUserDetailsAndRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found. Please log in.');

        const userResponse = await axios.get('${API_URL}/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(userResponse.data);

        const roomsResponse = await axios.get('${API_URL}/api/rooms/my-rooms', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const roomsData = roomsResponse.data;

        const initialBackgroundImages = {};
        roomsData.forEach((room) => {
          initialBackgroundImages[room.roomId] = getRandomBackgroundImage();
        });

        setRoomBackgroundImages(initialBackgroundImages);
        setRooms(roomsData);
        setFilteredRooms(roomsData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching data:', err);
      }
    };
    fetchUserDetailsAndRooms();
  }, []);

  useEffect(() => {
    const results = rooms.filter((room) =>
      room.roomName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRooms(results);
  }, [searchTerm, rooms]);

  const createRoom = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '${API_URL}/api/rooms/create',
        { roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      const newRoom = { roomId: response.data.roomId, roomName };
  
      // Generate a background image for the new room
      const newRoomBackgroundImage = getRandomBackgroundImage();
  
      setRooms([...rooms, newRoom]);
      setFilteredRooms([...rooms, newRoom]);
  
      // Update the room background images state
      setRoomBackgroundImages({
        ...roomBackgroundImages,
        [newRoom.roomId]: newRoomBackgroundImage
      });
  
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
        '${API_URL}/api/rooms/join',
        { roomId: roomIdToJoin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Successfully joined the room: ${response.data.room.roomName}`);
      const newRoomBackgroundImage = getRandomBackgroundImage();
      setRooms([...rooms, response.data.room]);
      setFilteredRooms([...rooms, response.data.room]);
      setRoomBackgroundImages({
        ...roomBackgroundImages,
        [response.data.room.roomId]: newRoomBackgroundImage
      });
      setRoomIdToJoin('');
      setIsJoinRoomVisible(false);
    } catch (err) {
      setError(err.message);
      console.error('Error joining room:', err);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/room/${roomId}`);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
    setShowSuccessMessage(false);
  };

  const getRandomBackgroundImage = () => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  };

  const handleClearSearch = () => {
    setSearchTerm(''); 
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/'); // Redirect to the login page
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="dashboard-container">
      <div className="profile-container">
        <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
        <div className="profile-content">
          {error ? (
            <p className="error">Error: {error}</p>
          ) : (
            userDetails && (
              <div>
                <img
                  src={userDetails.avatar}
                  alt="User Avatar"
                  className="user-avatar"
                  onClick={toggleModal}
                />
                <p className="dashboard-welcome">{userDetails.name}</p>
              </div>
            )
          )}
          <div className="logout">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
          </div>

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
          <div className="room-search-container">
            <h1>My Rooms</h1>
            <div className="search-btn">
              <input
                type="text"
                placeholder="Search Rooms"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="room-search-input"
              />
              {searchTerm ? (
                <FaTimes className="search-icon" onClick={handleClearSearch} /> // Clear icon
              ) : (
                <FaSearch className="search-icon" /> // Magnifying icon
              )}
            </div>
          </div>

          <div className="rooms-list">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <div
                  key={room.roomId}
                  className="room-card"
                  onClick={() => handleRoomClick(room.roomId)}
                  style={{ backgroundImage: `url(${roomBackgroundImages[room.roomId]})` }}
                >
                  <div className="room-info">
                    <p>{room.roomName}</p>
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
      {isModalOpen && (
        <div className="modal">
          
          <div className="modal-content">
            <span className="close" onClick={toggleModal}>&times;</span>
            <h2>User Details</h2>
            {userDetails && (
              <>
                <p><strong>Name:</strong> {userDetails.name}</p>
                <p><strong>Mobile:</strong> {userDetails.mobile}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;