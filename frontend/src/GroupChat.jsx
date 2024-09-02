import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ManageRoomUsers from './ManageRoomUsers';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function GroupChat() {
  const { roomId } = useParams();
  const location = useLocation();
  const { userId: receiverId } = location.state || {}; // Retrieve receiverId for personal chat
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(!receiverId); // Determine chat mode based on receiverId

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const endpoint = isGroupChat 
          ? `http://localhost:5000/api/chat/${roomId}`
          : `http://localhost:5000/api/chat/${roomId}/personal/${receiverId}`;
          
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(response.data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    socket.emit('joinRoom', { roomId, token: localStorage.getItem('token') });
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/auth/details', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(response.data);
      } catch (err) {
        console.error('Failed to fetch user details', err);
      }
    };

    fetchMessages();
    fetchUserDetails();
    
    // Handle back button or any navigation
    const handlePopState = () => {
      navigate(`/room/${roomId}`);  // Redirect to dashboard
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      socket.off('onlineUsers');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomId, receiverId, isGroupChat, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint = isGroupChat
        ? `http://localhost:5000/api/chat/${roomId}`
        : `http://localhost:5000/api/chat/${roomId}/personal/${receiverId}`;

      const response = await axios.post(
        endpoint,
        {
          senderId: userDetails._id,
          message: newMessage,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newMsg = {
        ...response.data,
        sender: {
          name: userDetails.name,
          avatar: userDetails.avatar,
        },
      };

      setMessages((prevMessages) => [...prevMessages, newMsg]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleLogout = () => {
    socket.emit('logout', { roomId, token: localStorage.getItem('token') });
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleGroupHref = () => {
    setIsGroupChat(true); // Switch to group chat mode
    navigate(`/room/${roomId}/group-chat`);
  };

  const handlePersonalChat = (userId) => {
    setIsGroupChat(false); // Switch to personal chat mode
    navigate(`/room/${roomId}/group-chat`, { state: { userId } }); // Pass the receiverId through state
  };

  return (
    <div className='chat-container'>
      <div className="profile-container">
        <button onClick={handleGroupHref}>Group Chat</button>
        {/* Pass handlePersonalChat to ManageRoomUsers */}
        <ManageRoomUsers roomId={roomId} onlineUsers={onlineUsers} onUserClick={handlePersonalChat} />
      </div>
      <h2>{isGroupChat ? `Group Chat for Room: ${roomId}` : `Personal Chat with User: ${receiverId}`}</h2>
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.sender.avatar && (
              <img
                src={message.sender.avatar}
                alt={`${message.sender.name}'s avatar`}
                className="avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '8px' }}
              />
            )}
            <div>
              <strong>{message.sender.name}</strong>: {message.message}
              <div className="timestamp" style={{ fontSize: '0.8em', color: '#666' }}>
                {new Date(message.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}

export default GroupChat;
