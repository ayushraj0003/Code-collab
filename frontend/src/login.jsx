import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import './styles.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  const API_URL = process.env.REACT_APP_BACKEND_URL;
  const API_FRONT = process.env.REACT_APP_FRONTEND_URL

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post('${API_URL}/api/auth/login', formData);
      console.log('Login successful: ', response.data);
      const token = response.data.token;
      localStorage.setItem('token', token);
      window.location.href = '${API_FRONT}/dashboard';
    } catch (error) {
      console.error('There was an error logging in: ', error.response.data);
    }
  };

  return (
    <div className="register-container">
    <div className="leftlogin">
      <div className="login-header">
        <img src="../public/images/logo.jpg" alt="Logo" className="login-logo" />
        <h1>Welcome Back!</h1>
        <p>Please enter login details below</p>
      </div>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter the email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="Enter the Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
        </div>
        <a href="#" className="forgot-password">Forgot password?</a>
        <button type="submit" className="login-btn">Sign in</button>
        <div className="or-divider">
          <span>Or continue</span>
        </div>

        <div className="signup-link">
          <p>Don’t have an account? <Link to="/">Sign Up</Link></p>
        </div>
      </form>
      </div>
      <div className="rightlogin">

      </div>
    </div>
  );
}

export default Login;
