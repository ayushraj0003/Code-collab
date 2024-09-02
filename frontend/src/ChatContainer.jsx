import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ManageRoomUsers from './ManageRoomUsers';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function ChatContainer() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isGroupChat, setIsGroupChat] = useState(true); // State to toggle between group and personal chat
  const [receiverId, setReceiverId] = useState(null); // State to manage personal chat user ID

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = isGroupChat
          ? await axios.get(`http://localhost:5000/api/chat/${roomId}`)
          : await axios.get(`http://localhost:5000/api/chat/${roomId}/personal/${receiverId}`);
        setMessages(response.data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

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

    socket.emit('joinRoom', { roomId, token: localStorage.getItem('token') });
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    fetchMessages();
    fetchUserDetails();

    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      socket.off('onlineUsers');
    };
  }, [roomId, isGroupChat, receiverId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const endpoint = isGroupChat
        ? `http://localhost:5000/api/chat/${roomId}`
        : `http://localhost:5000/api/chat/personal/${roomId}`;
      const data = isGroupChat
        ? { senderId: userDetails._id, message: newMessage }
        : { message: newMessage, receiverId };

      const response = await axios.post(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const newMsg = isGroupChat
        ? {
            ...response.data,
            sender: {
              name: userDetails.name,
              avatar: userDetails.avatar,
            },
          }
        : response.data;

      setMessages((prevMessages) => [...prevMessages, newMsg]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const toggleChatMode = (userId) => {
    setIsGroupChat(!isGroupChat);
    setReceiverId(userId);
  };

  return (
    <div className='chat-container'>
      <div className="profile-container">
        <button onClick={() => setIsGroupChat(true)}>Group Chat</button>
        <ManageRoomUsers
          roomId={roomId}
          onlineUsers={onlineUsers}
          onUserClick={toggleChatMode} // Pass function to handle user click
        />
      </div>
      
      {isGroupChat ? (
        <h2>Group Chat for Room: {roomId}</h2>
      ) : (
        <h2>Personal Chat with User {receiverId} in Room {roomId}</h2>
      )}

      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.sender && message.sender.avatar && (
              <img
                src={message.sender.avatar}
                alt={`${message.sender.name}'s avatar`}
                className="avatar"
                style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '8px' }}
              />
            )}
            <div>
              <strong>{message.sender?.name}</strong>: {message.message}
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

export default ChatContainer;
