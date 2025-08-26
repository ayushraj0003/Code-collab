import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MemberChat from './MemberChat';
import io from 'socket.io-client';
import { FaSignOutAlt, FaUsers, FaTimes, FaBars } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const socket = io(`${API_URL}`);

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
  const [receiverDetails, setReceiverDetails] = useState(null); // Store the receiver's details in personal chat
  const [showSidebar, setShowSidebar] = useState(false); // State to show/hide sidebar
  const [isMobileSidebarVisible, setIsMobileSidebarVisible] = useState(false); // State for mobile sidebar
  const messagesEndRef = useRef(null); // Ref to keep track of the end of the messages list

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserDetails(response.data);
      } catch (err) {
        console.error('Failed to fetch user details', err);
      }
    };

    const fetchReceiverDetails = async () => {
      if (!receiverId) return;
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/auth/userdetail/${receiverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceiverDetails(response.data);
      } catch (err) {
        console.error('Failed to fetch receiver details', err);
      }
    };

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const endpoint = isGroupChat
          ? `${API_URL}/api/chat/${roomId}`
          : `${API_URL}/api/chat/${roomId}/personal/${receiverId}`;

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

    // **FIXED: Listen to appropriate chat events based on chat mode**
    
    // Listen for group messages ONLY when in group chat mode
    if (isGroupChat) {
      socket.on('newGroupMessage', (message) => {
        console.log('Received new group message:', message);
        if (message && message.sender && message.sender._id) {
          setMessages((prevMessages) => [...prevMessages, message]);
        } else {
          console.error('Received invalid group message data:', message);
        }
      });
    } else {
      // Listen for personal messages ONLY when in personal chat mode
      socket.on('newPersonalMessage', (message) => {
        console.log('Received new personal message:', message);
        if (message && message.sender && message.sender._id) {
          // Only show messages between current user and the selected receiver
          const currentUserId = userDetails?._id;
          if (
            (message.sender._id === currentUserId && message.receiver?._id === receiverId) ||
            (message.sender._id === receiverId && message.receiver?._id === currentUserId)
          ) {
            setMessages((prevMessages) => [...prevMessages, message]);
          }
        } else {
          console.error('Received invalid personal message data:', message);
        }
      });
    }

    fetchUserDetails();
    fetchReceiverDetails();
    fetchMessages();

    const handlePopState = () => {
      navigate(`/room/${roomId}`); // Redirect to room
    };
    
    const handleBeforeUnload = () => {
      socket.emit('disconnectUser', { roomId, token: localStorage.getItem('token') });
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      socket.emit('leaveRoom', { roomId, token: localStorage.getItem('token') });
      socket.off('onlineUsers');
      socket.off('newGroupMessage'); // Remove group message listener
      socket.off('newPersonalMessage'); // Remove personal message listener
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, receiverId, isGroupChat, navigate, userDetails?._id]);

  useEffect(() => {
    // Scroll to the bottom whenever messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userDetails) return; // Ensure userDetails is loaded before sending a message

    try {
      const token = localStorage.getItem('token');
      const endpoint = isGroupChat
        ? `${API_URL}/api/chat/${roomId}`
        : `${API_URL}/api/chat/${roomId}/personal/${receiverId}`;

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

      // **FIXED: Use appropriate socket events for different chat types**
      if (isGroupChat) {
        // Emit group message
        socket.emit('sendGroupMessage', {
          roomId,
          message: newMessage,
          senderId: userDetails._id
        });
      } else {
        // Emit personal message
        socket.emit('sendPersonalMessage', {
          roomId,
          message: newMessage,
          senderId: userDetails._id,
          receiverId: receiverId
        });
      }

      setNewMessage(''); // Clear the input after sending
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleLogout = () => {
    socket.emit('logout', { roomId, token: localStorage.getItem('token') });
    localStorage.removeItem('token');
    navigate('/');
  };

  // Update the handleGroupHref function
  const handleGroupHref = (e) => {
    if (e) e.stopPropagation(); // Stop event from bubbling up
    
    setIsGroupChat(true); // Switch to group chat mode
    setShowSidebar(false);
    navigate(`/room/${roomId}/chat`);
    
    // Don't close sidebar immediately on mobile - let the navigation complete
    // Close it after a small delay instead
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        setIsMobileSidebarVisible(false);
        document.body.style.overflow = '';
      }, 300); // 300ms delay to let navigation complete first
    }
  };

  // Update the handlePersonalChat function
  const handlePersonalChat = (userId, e) => {
    if (e) e.stopPropagation(); // Stop event from bubbling up
    
    setIsGroupChat(false); // Switch to personal chat mode
    navigate(`/room/${roomId}/chat`, { state: { userId } });
    
    // Don't close sidebar immediately on mobile - let the navigation complete
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        setIsMobileSidebarVisible(false);
        document.body.style.overflow = '';
      }, 300); // 300ms delay to let navigation complete first
    }
  };

  const toggleSidebar = () => {
    setShowSidebar((prevShowSidebar) => !prevShowSidebar);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarVisible(!isMobileSidebarVisible);
    
    // Prevent body scrolling when sidebar is open
    if (!isMobileSidebarVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  if (!userDetails) {
    return <div>Loading...</div>; // Show a loading state until user details are fetched
  }

  return (
    <div className="chat-container">
      {/* Mobile sidebar toggle button - only visible when sidebar is closed */}
      <button 
        className="chat-mobile-toggle-open"
        onClick={toggleMobileSidebar}
        aria-label="Open sidebar"
      >
        <FaBars />
      </button>
      
      {/* Dark overlay when sidebar is open */}
      <div 
        className={`chat-mobile-overlay ${isMobileSidebarVisible ? 'visible' : ''}`}
        onClick={toggleMobileSidebar}
      ></div>
      
      {/* Update profile container to use mobile visibility state */}
      <div className={`profile-container ${isMobileSidebarVisible ? 'visible' : ''}`}>
        {/* Add close button for mobile view */}
        <button 
          className="chat-mobile-toggle-close"
          onClick={toggleMobileSidebar}
          aria-label="Close sidebar"
        >
          <FaTimes />
        </button>
        
        {/* Rest of your profile-container content remains the same */}
        <button
          className={`group-btn ${isGroupChat ? 'active' : ''}`}
          onClick={(e) => handleGroupHref(e)}
        >
          <FaUsers size={34} /> Group Chat
        </button>
        <MemberChat
          roomId={roomId}
          onlineUsers={onlineUsers}
          onUserClick={(userId, e) => handlePersonalChat(userId, e)}
          activeUserId={isGroupChat ? null : receiverId}
        />
        <div className="logout">
          <button onClick={handleLogout} className="logout-btn">
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
      
      {/* Rest of your component remains the same */}
      <div className={`main-content ${isMobileSidebarVisible ? 'dimmed' : ''}`}>
        <div className="chat-header">
          {isGroupChat ? (
            <h2>Group Chat</h2>
          ) : (
            receiverDetails && (
              <div
                className="receiver-info"
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={toggleSidebar} // Open sidebar on avatar click
              >
                <img
                  src={receiverDetails.avatar}
                  alt={`${receiverDetails.name}'s avatar`}
                  className="avatar"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '8px' }}
                />
                <h2>{receiverDetails.name}</h2>
              </div>
            )
          )}
        </div>
        <hr className="styled-hr" />
        <div className={`messages ${showSidebar ? 'short' : " "}`}>
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
          <div ref={messagesEndRef}></div>
        </div>
        <div className={`txt-box ${showSidebar ? 'short' : ''}`}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message"
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
      {showSidebar && receiverDetails && (
        <div className="sidebar">
          <button className="close-sidebar" onClick={toggleSidebar}>
            <FaTimes /> Close
          </button>
          <div className="user-details">
            <img
              src={receiverDetails.avatar}
              alt={`${receiverDetails.name}'s avatar`}
              className="avatar-large"
              style={{ width: '100px', height: '100px', borderRadius: '50%' }}
            />
            <h3>{receiverDetails.name}</h3>
            <p>Email: {receiverDetails.email}</p>
            <p>Contact:{receiverDetails.mobile}</p>
          </div>
        </div>
      )}
      {isMobileSidebarVisible && receiverDetails && (
        <div className="mobile-sidebar">
          <button className="close-sidebar" onClick={toggleMobileSidebar}>
            <FaTimes /> Close
          </button>
          <div className="user-details">
            <img
              src={receiverDetails.avatar}
              alt={`${receiverDetails.name}'s avatar`}
              className="avatar-large"
              style={{ width: '100px', height: '100px', borderRadius: '50%' }}
            />
            <h3>{receiverDetails.name}</h3>
            <p>Email: {receiverDetails.email}</p>
            <p>Contact:{receiverDetails.mobile}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupChat;
