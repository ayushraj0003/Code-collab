import { useState } from "react";
import axios from "axios";
import React from "react";
function SignInForm() {
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
    <div className="form-containers sign-in-container">
      <form onSubmit={handleSubmit}>
        <h1>Sign in</h1>
        <div className="social-containers">
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
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
        />
        <a href="#">Forgot your password?</a>
        <button className="ghost1">Sign In</button>
      </form>
    </div>
  );
}

export default SignInForm;
