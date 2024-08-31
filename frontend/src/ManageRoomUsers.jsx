import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ManageRoomUsers({ roomId, onlineUsers }) {
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // State to hold the current user
  const [activeMenuUserId, setActiveMenuUserId] = useState(null); // State to manage which user's menu is open

  useEffect(() => {
    // Fetch current user details
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

    // Fetch room details including users and owner
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
      setUsers(users.filter(user => user._id !== userId)); // Update the UI
      alert('User removed successfully');
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  const toggleMenu = (userId) => {
    setActiveMenuUserId(prev => (prev === userId ? null : userId)); // Toggle menu
  };

  const handleChangeOwner = async (newOwnerId) => {
    if (!window.confirm('Are you sure you want to transfer ownership to this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rooms/${roomId}/change-owner/${newOwnerId}`, {
        
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwnerId(newOwnerId);
      alert('Ownership transferred successfully');
    } catch (error) {
      console.error('Error changing ownership:', error);
      alert('Failed to change ownership');
    }
  };

  return (
    <div>
      <h3>Members:</h3>
      {users && users.length > 0 ? (
        <ul>
          {users.map(user => (
            <li key={user._id} className="member-item">
              <img src={user.avatar} alt={user.name} className="member-avatar" />
              <div className="user-name">{user.name}</div>
              {onlineUsers.includes(user._id) && (
                <span className="online-indicator"></span> // Green indicator for online status
              )}
              {user._id === ownerId && (
                <span className="owner-badge"> Owner</span>
              )}
              {currentUser && currentUser._id === ownerId && user._id !== ownerId && (
                <>
                  <button className="more-options" onClick={() => toggleMenu(user._id)}>...</button>
                  {activeMenuUserId === user._id && (
                    <div className="options-menu">
                      <button onClick={() => handleRemoveUser(user._id)}>Remove User</button>
                      <button onClick={() => handleChangeOwner(user._id)}>Make Owner</button>
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
    </div>
  );
}

export default ManageRoomUsers;
