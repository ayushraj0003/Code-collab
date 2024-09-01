import React, { useState, useEffect } from 'react';
import { useParams,useLocation, useNavigate  } from 'react-router-dom';
import axios from 'axios';
import ManageRoomUsers from './ManageRoomUsers';
import io from 'socket.io-client';

const socket = io('http://localhost:5000'); 

function GroupChat() {
  const { roomId } = useParams();
  const naveigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // const onlineUsers = location.state?.myArray || [];
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/chat/${roomId}`);
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
    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
            socket.off('onlineUsers'); // Cleanup event listeners
          };
  }, [roomId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/chat/${roomId}`,
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
          avatar: userDetails.avatar, // Include avatar in the new message
        },
      };

      setMessages((prevMessages) => [...prevMessages, newMsg]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };
  const handleLogout = () => {
    socket.emit('logout', { roomId, token: localStorage.getItem('token')});
    // socket.disconnect();
    localStorage.removeItem('token');
    // navigate('/');
  };

  return (
    <div className='chat-container'>
      <div className="profile-container">
        <ManageRoomUsers roomId={roomId} onlineUsers={onlineUsers}/>
      </div>
      <h2>Group Chat for Room: {roomId}</h2>
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.sender.avatar && (
              <img
                src={message.sender.avatar} // Avatar URL
                alt={`${message.sender.name}'s avatar`}
                className="avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '8px' }}
              />
            )}
            <div>
              <strong>{message.sender.name}</strong>: {message.message}
              <div className="timestamp" style={{ fontSize: '0.8em', color: '#666' }}>
                {new Date(message.timestamp).toLocaleString()} {/* Format timestamp */}
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
