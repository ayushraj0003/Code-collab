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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', formData);
      console.log('Login successful: ', response.data);
      const token = response.data.token;
      localStorage.setItem('token', token);
      window.location.href = 'http://localhost:3000/dashboard';
    } catch (error) {
      console.error('There was an error logging in: ', error.response.data);
    }
  };

  return (
    <div className="container" id="container">
      <div className="form-container sign-in-container">
        <form onSubmit={handleSubmit}>
          <h1>Sign in</h1>
          <span>or use your account</span>
          <input
            type="email"
            placeholder="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            type="password"
            placeholder="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
          />
          <a href="#">Forgot your password?</a>
          <button type="submit">Sign In</button>
        </form>
      </div>
      <div>
        <p>New user :</p>
        <Link to="/">
              <button >Sign Up</button>
        </Link>
      </div>
    </div>
  );
}

export default Login;
