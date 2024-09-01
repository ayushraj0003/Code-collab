import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ManageRoomUsers({ roomId, onlineUsers }) {
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeMenuUserId, setActiveMenuUserId] = useState(null); 
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Error fetching current user details:', error);
      }
    };

    const fetchRoomDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data.users);
        setOwnerId(response.data.userId);
      } catch (error) {
        console.error('Error fetching room details:', error);
      }
    };

    fetchCurrentUser();
    fetchRoomDetails();
  }, [roomId]);

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/rooms/${roomId}/remove-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (currentUser._id === userId) {
        // Navigate the removed user to the dashboard
        alert('You have been removed from the room');
        navigate('/dashboard'); // Redirect to the dashboard
      } else {
        setUsers(users.filter(user => user._id !== userId)); // Update the UI
        alert('User removed successfully');
      }
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  const toggleMenu = (userId) => {
    setActiveMenuUserId(prev => (prev === userId ? null : userId)); 
  };

  const handleChangeOwner = async (newOwnerId) => {
    if (!window.confirm('Are you sure you want to transfer ownership to this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rooms/${roomId}/change-owner/${newOwnerId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwnerId(newOwnerId);
      alert('Ownership transferred successfully');
    } catch (error) {
      console.error('Error changing ownership:', error);
      alert('Failed to change ownership');
    }
  };

  const handleUserClick = (roomId, userId) => {
    if (currentUser && currentUser._id === userId) {
      // If the current user clicks on their own avatar, do nothing
      return;
    }
    
    navigate(`/room/${roomId}/personal-chat`, { state: { roomId, userId } });
  };
  

  return (
    <>
      {users && users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li
              key={user._id}
              className="member-item"
              onClick={() => handleUserClick(roomId, user._id)} // Add click handler
              style={{ cursor: 'pointer' }} // Add cursor style to indicate it's clickable
            >
              <img src={user.avatar} alt={user.name} className="member-avatar" />
              <div className="user-name">{user.name}</div>
              {onlineUsers.includes(user._id) && (
                <span className="online-indicator"></span> 
              )}
              {user._id === ownerId && (
                <span className="owner-badge"> Owner</span>
              )}
              {currentUser && currentUser._id === ownerId && user._id !== ownerId && (
                <>
                  <button className="more-options" onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling to the li click handler
                    toggleMenu(user._id);
                  }}>...</button>
                  {activeMenuUserId === user._id && (
                    <div className="options-menu">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUser(user._id);
                      }}>Remove User</button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleChangeOwner(user._id);
                      }}>Make Owner</button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No users found.</p>
      )}
    </>
  );
}

export default ManageRoomUsers;
 