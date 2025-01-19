import React, { useEffect, useState } from 'react';
import axios from 'axios'; // Make sure axios is imported
// import './UserDetailsPopup.css'; // Import CSS for styling

const UserDetailsPopup = ({ user, onClose }) => {
  const [userDetails, setUserDetails] = useState(null);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/userdetail/${user}`);
        setUserDetails(response.data);
      } catch (err) {
        console.error('Failed to fetch user details', err);
      }
    };

    if (user) {
      fetchUserDetails();
    }
  }, [user]);

  if (!userDetails) return null;

  return (
    <div className="user-details-popup">
      <button className="close-btn" onClick={onClose}>×</button>
      <div className="user-details-content">
        <img src={userDetails.avatar} alt={`${userDetails.name}'s avatar`} className="user-avatar" />
        <h3>{userDetails.name}</h3>
        <p>Email: {userDetails.email}</p>
        <p>Phone: {userDetails.mobile}</p> {/* Assuming phone number is part of user details */}
      </div>
    </div>
  );
};

export default UserDetailsPopup;
