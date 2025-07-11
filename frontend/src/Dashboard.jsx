import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './styles.css';
import { FaSearch, FaTimes, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaCopy, FaExternalLinkAlt } from 'react-icons/fa'; // Import copy and link icons

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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(''); // State for copy success message

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

        const userResponse = await axios.get(`${API_URL}/api/auth/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(userResponse.data);

        const roomsResponse = await axios.get(`${API_URL}/api/rooms/my-rooms`, {
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
        `${API_URL}/api/rooms/create`,
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
        `${API_URL}/api/rooms/join`,
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

  // Function to copy room link
  const handleCopyRoomLink = async (roomId, event) => {
    event.stopPropagation(); // Prevent room card click
    
    try {
      const roomLink = `${window.location.origin}/room/${roomId}`;
      await navigator.clipboard.writeText(roomLink);
      
      setCopySuccess(roomId);
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setCopySuccess('');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy room link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${window.location.origin}/room/${roomId}`;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(roomId);
        setTimeout(() => {
          setCopySuccess('');
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const getRandomBackgroundImage = () => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    return backgroundImages[randomIndex];
  };

  const handleClearSearch = () => {
    setSearchTerm(''); 
    setIsSearchExpanded(false);
  };

  const handleSearchIconClick = () => {
    if (isSearchExpanded && searchTerm) {
      // If expanded and has search term, perform search action here if needed
      console.log('Searching for:', searchTerm);
    } else if (isSearchExpanded) {
      // If expanded but no search term, collapse
      setIsSearchExpanded(false);
      setSearchTerm('');
    } else {
      // If collapsed, expand
      setIsSearchExpanded(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/'); // Redirect to the login page
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  // Handle clicking outside search bar to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSearchExpanded && !event.target.closest('.search-btn')) {
        setIsSearchExpanded(false);
        if (!searchTerm) {
          // Only clear if there's no search term to preserve user input
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchTerm]);

  return (
    <div className="dashboard-container">
      <div className={`profile-container ${isSidebarVisible ? 'visible' : 'hidden'}`}>
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isSidebarVisible ? <FaChevronLeft /> : <FaChevronRight />}
        </button>
        <img src="/images/logo3.png" alt="Logo" className="dash-logo" />
       <div className="profile-content">
  {error ? (
    <p className="error">Error: {error}</p>
  ) : (
    userDetails && (
      <div className="user-section">
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

      {/* Sidebar toggle button for when sidebar is hidden */}
      {!isSidebarVisible && (
        <button className="sidebar-toggle-floating" onClick={toggleSidebar}>
          <FaChevronRight />
        </button>
      )}

      <div className={`main-content ${!isSidebarVisible ? 'expanded' : ''}`}>
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
  <div className={`form-container-new ${isCreateRoomVisible ? 'visible' : ''}`}>
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
<div className={`form-container-new ${isJoinRoomVisible ? 'visible' : ''}`}>
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
            <div className={`search-btn ${isSearchExpanded ? 'expanded' : 'collapsed'}`}>
              {isSearchExpanded && (
                <input
                  type="text"
                  placeholder="Search Rooms"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="room-search-input"
                  autoFocus
                />
              )}
              {searchTerm && isSearchExpanded ? (
                <FaTimes className="search-icon" onClick={handleClearSearch} />
              ) : (
                <FaSearch className="search-icon" onClick={handleSearchIconClick} />
              )}
            </div>
          </div>

          <div className="rooms-list">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room, index) => (
                <div
                  key={room.roomId}
                  className={`room-card ${index < 3 ? 'new-room' : ''}`}
                  onClick={() => handleRoomClick(room.roomId)}
                >
                  {/* Room Card Header */}
                  <div className="room-card-header">
                    <div className="room-icon">
                      <i className="fas fa-code"></i>
                    </div>
                    <div className="room-status">
                      Active
                    </div>
                  </div>

                  {/* Room Card Content */}
                  <div className="room-card-content">
                    <h3 className="room-name">{room.roomName}</h3>
                    <p className="room-description">
                      Collaborative coding workspace for real-time development
                    </p>
                  </div>

                  {/* Room Card Footer */}
                  <div className="room-card-footer">
                    <div className="room-id-badge">
                      ID: {room.roomId.slice(0, 8)}...
                    </div>
                    <div className="room-actions">
                      <div className="room-members">
                        <i className="fas fa-users"></i>
                        <span>{Math.floor(Math.random() * 5) + 1}</span>
                      </div>
                      <button
                        className={`copy-link-btn ${copySuccess === room.roomId ? 'copied' : ''}`}
                        onClick={(e) => handleCopyRoomLink(room.roomId, e)}
                        title="Copy room link"
                      >
                        {copySuccess === room.roomId ? (
                          <>
                            <i className="fas fa-check"></i>
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <FaCopy />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Copy Success Tooltip */}
                  {copySuccess === room.roomId && (
                    <div className="copy-success-tooltip">
                      Room link copied to clipboard!
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rooms-empty-state">
                <i className="fas fa-folder-open"></i>
                <h3>No Rooms Found</h3>
                <p>
                  {searchTerm 
                    ? `No rooms match your search for "${searchTerm}"`
                    : "You haven't created or joined any rooms yet. Create your first room to get started!"
                  }
                </p>
              </div>
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