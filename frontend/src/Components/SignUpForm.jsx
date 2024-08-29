import React from "react";
import { useState } from "react";
import axios from "axios";
function SignUpForm() {
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
      const response = await axios.post('http://localhost:5000/api/auth/register', formData);
      console.log(response);
      const token = response.data.token;
      localStorage.setItem('token', token);
      window.location.href = 'http://localhost:3000/dashboard';
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
        <button className="ghost1">Sign Up</button>
      </form>
    </div>
  );
}

export default SignUpForm;
