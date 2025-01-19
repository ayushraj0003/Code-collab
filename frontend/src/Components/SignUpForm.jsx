import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from 'react-router-dom';

function SignUpForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    avatar: '',  // Add avatar to formData
  });
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false); // Track OTP verification status

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

  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const API_FRONT = process.env.REACT_APP_FRONTEND_URL

  const handleSendOTP = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, { email: formData.email });
      alert(response.data.message);
    } catch (error) {
      console.error('Failed to send OTP', error);
      alert('Failed to send OTP');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email: formData.email, otp });
      alert(response.data.message);
      setOtpVerified(true);

    } catch (error) {
      console.error('Failed to verify OTP', error);
      alert('Invalid OTP');
    }
  };

  const handleSubmit = async (event) => {
    console.log(otpVerified)
    event.preventDefault();
    if (!otpVerified) {
      alert('Please verify OTP before registering.');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, formData);
      console.log(response);
      const token = response.data.token;
      console.log(token );
      localStorage.setItem('token', token);
      // window.location.href = `${API_FRONT}/dashboard`;
      navigate('/dashboard');
    } catch (error) {
      console.error('There was an error registering: ', error.response.data);
    }
  };

  return (
    <div className="form-containers sign-up-container">
      <form onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <div className="social-container">
          <a href="#" className="social">
            <i className="fab fa-facebook-f" />
          </a>
          <a href="#" className="social">
            <i className="fab fa-google-plus-g" />
          </a>
          <a href="#" className="social">
            <i className="fab fa-linkedin-in" />
          </a>
        </div>
        <span>or use your email for registration</span>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Name"
        />
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Email"
        />
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Password"
        />
        <input
          type="text"
          placeholder="Enter your mobile number"
          name="mobile"
          value={formData.mobile}
          onChange={handleChange}
        />
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
        <button type="button" onClick={handleSendOTP}>Send OTP</button>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
        />
        <div className="h">

        <button type="button" onClick={handleVerifyOTP}>Verify OTP</button>
        <button type="submit" className="ghost1">Sign Up</button>
        </div>

        
      </form>
    </div>
  );
}

export default SignUpForm;
