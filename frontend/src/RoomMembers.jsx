import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RoomMembers({ roomId, onlineUsers}) { 
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeMenuUserId, setActiveMenuUserId] = useState(null); 
  const navigate = useNavigate(); 

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('${API_URL}/api/auth/details', {
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
        const response = await axios.get(`${API_URL}/api/rooms/${roomId}`, {
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
      await axios.delete(`${API_URL}/api/rooms/${roomId}/remove-user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (currentUser._id === userId) {
        alert('You have been removed from the room');
        navigate('/dashboard');
      } else {
        setUsers(users.filter(user => user._id !== userId));
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
      await axios.post(`${API_URL}/api/rooms/${roomId}/change-owner/${newOwnerId}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOwnerId(newOwnerId); 
      alert('Ownership transferred successfully');
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert('Failed to transfer ownership');
    }
  };

  return (
    <div>
      <h2>Room Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user._id} className="member-item" onClick={() => {
            if (user._id !== currentUser._id) {  // Prevent clicking on self
            }
          }}>
            {user.avatar && (
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="avatar"
                style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }}
              />
            )}
            <strong>{user.name}</strong>  
            {user._id === ownerId && (
              <span className="owner-badge"> Owner</span>
            )}
            {user._id === currentUser?._id ? ' (You)' : ''}
            {onlineUsers.includes(user._id) && <span className="online-indicator"></span>}
            {ownerId === currentUser?._id && user._id !== currentUser._id && (
              <div>
                <button onClick={() => toggleMenu(user._id)}>Menu</button>
                {activeMenuUserId === user._id && (
                  <div className="user-menu">
                    <button onClick={() => handleRemoveUser(user._id)}>Remove</button>
                    <button onClick={() => handleChangeOwner(user._id)}>Make Owner</button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RoomMembers;
