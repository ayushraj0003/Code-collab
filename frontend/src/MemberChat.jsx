import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MemberChat({ roomId, onlineUsers, onUserClick, activeUserId }) {
  const [users, setUsers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState(null); // Track the active user
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

  const handleUserClick = (userId) => {
    if (userId !== currentUser._id) {  // Prevent clicking on self
      setActiveMenuUserId(userId); // Set the active user ID
      onUserClick(userId);
    }
  };

  return (
    <div>
      <ul>
        {users.map((user) => (
          <li
            key={user._id}
            className={`member-item ${activeUserId === user._id ? 'active' : ''}`} // Apply 'active' class if user is selected
            onClick={() => handleUserClick(user._id)}
          >
            {user.avatar && (
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="avatar"
                style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }}
              />
            )}
            <strong>{user.name}</strong>
            {user._id === ownerId && <span className="owner-badge"> Owner</span>}
            {user._id === currentUser?._id ? ' (You)' : ''}
            {onlineUsers.includes(user._id) && <span className="online-indicator"></span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MemberChat;
