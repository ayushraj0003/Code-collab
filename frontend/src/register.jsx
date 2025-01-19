import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import './styles.css';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    avatar: '',  // Add avatar to formData
  });

  const avatars = [
    "/images/avatar1.jpg",
    "/images/avatar2.jpg",
    "/images/avatar3.jpg",
    "/images/avatar4.jpg",
    "/images/avatar5.jpg",
    "/images/avatar6.jpg",
    "/images/avatar7.jpg",
    "/images/avatar8.jpg",
  ];

  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const API_FRONT = process.env.REACT_APP_FRONTEND_URL

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAvatarSelect = (avatar) => {
    setFormData({
      ...formData,
      avatar
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      const response = await axios.post('${API_URL}/api/auth/register', formData);
      console.log(response);
      const token = response.data.token;
      localStorage.setItem('token', token);
      window.location.href = '${API_FRONT}/dashboard';
    } catch (error) {
      console.error('There was an error registering: ', error.response.data);
    }
  };

  return (
    <div className="login-container">
      <div className="leftlogin">
        <div className="login-header">
          <img src="/images/logo1.png" alt="Logo" className="login-logo" />
          <h1>Create Account</h1>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          <div className="input-group">
            <label>Mobile Number</label>
            <input
              type="text"
              placeholder="Enter your mobile number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
          </div>

          <div className="avatar-selection">
            <p>Select an Avatar:</p>
            <div className="avatar-options">
              {avatars.map((avatar, index) => (
                <img
                  key={index}
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className={`avatar ${formData.avatar === avatar ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(avatar)}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="login-btn">Sign Up</button>
        </form>
        <div className="signup-link">
          <p>Already a user? <Link to="/login">Log in</Link></p>
        </div>
      </div>
      <div className="rightlogin">
        <img src="/images/banner2.webp" alt="Banner" />
        <img src="/images/banner3.jpg" alt="Banner" />
        <img src="/images/banner4.gif" alt="Banner" />
      </div>
    </div>
  );
}

export default Signup;
