import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

function PersonalChat() {
  const location = useLocation();
  const { roomId, userId: receiverId } = location.state; // Retrieve roomId and receiverId from state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  

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

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/chat/${roomId}/personal/${receiverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessages(response.data);
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    fetchCurrentUser();
    fetchMessages();
  }, [roomId, receiverId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
        
      const token = localStorage.getItem('token');
      console.log(token)
      console.log(roomId)
      const response = await axios.post(`http://localhost:5000/api/chat/personal/${roomId}`, {
        message: newMessage,
        receiverId: receiverId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages(prevMessages => [...prevMessages, response.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div>
      <h2>Personal Chat with User {receiverId} in Room {roomId}</h2>
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.sender.name}</strong>: {message.message}
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

export default PersonalChat;
