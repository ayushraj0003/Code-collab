import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ManageRoomUsers from './ManageRoomUsers';
import io from 'socket.io-client';
import { FaSignOutAlt } from 'react-icons/fa';
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
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    // Join the room via socket
    socket.emit('joinRoom', { roomId, token: localStorage.getItem('token') });
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('newMessage', ({ newMsg }) => { // Destructure to get newMsg
      if (newMsg && newMsg.sender && newMsg.sender._id) { // Validate message data
        console.log('Received new message:', newMsg);
        setMessages((prevMessages) => [...prevMessages, newMsg]);
      } else {
        console.error('Received invalid message data:', newMsg);
      }
    });
    fetchUserDetails();
    fetchMessages();
    
    // Handle back button or any navigation
    const handlePopState = () => {
      navigate(`/room/${roomId}`);  // Redirect to dashboard
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      socket.off('onlineUsers');
      socket.off('newMessage'); // Cleanup listener on component unmount
      window.removeEventListener('popstate', handlePopState);
    };
  }, [roomId, receiverId, isGroupChat, navigate]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userDetails) return; // Ensure userDetails is loaded before sending a message

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
          _id: userDetails._id, // Ensure sender ID is set correctly
          name: userDetails.name,
          avatar: userDetails.avatar,
        },
      };

      // Emit the new message to the server so it can be broadcasted
      socket.emit('sendMessage', {newMsg,roomId});

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
    navigate(`/room/${roomId}/chat`);
  };

  const handlePersonalChat = (userId) => {
    setIsGroupChat(false); // Switch to personal chat mode
    navigate(`/room/${roomId}/chat`, { state: { userId } }); // Pass the receiverId through state
  };

  if (!userDetails) {
    return <div>Loading...</div>; // Show a loading state until user details are fetched
  }

  return (
    <div className='chat-container'>
      <div className="profile-container">
        <button className='group-btn' onClick={handleGroupHref}>Group Chat</button>
        <ManageRoomUsers roomId={roomId} onlineUsers={onlineUsers} onUserClick={handlePersonalChat} />
        <div className="logout">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
      <div className="main-content">
        <h2>{isGroupChat ? `Group Chat for Room: ${roomId}` : `Personal Chat with User: ${receiverId}`}</h2>
        <div className="messages">
          {messages.map((message, index) => {
            const isSender = message.sender._id === userDetails._id; // Check if the message is from the current user

            return (
              <div
                key={index}
                className={`message ${isSender ? 'sent' : 'received'}`} // Apply 'sent' or 'received' class based on sender
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
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
              </div>
            );
          })}
        </div>
       <div className="txt-box">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage();
              }
            }}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default GroupChat;
