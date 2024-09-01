import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function GroupChat() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/chat/${roomId}`);
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

    fetchMessages();
    fetchUserDetails();
  }, [roomId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      console.log(userDetails);
      console.log(newMessage)
      const response = await axios.post(`http://localhost:5000/api/chat/${roomId}`, {
        senderId: userDetails._id,
        message: newMessage,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessages((prevMessages) => [...prevMessages, response.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div>
      <h2>Group Chat for Room: {roomId}</h2>
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

export default GroupChat;
