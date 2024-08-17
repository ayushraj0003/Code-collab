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
    <div className="container" id="container">
      <div className="form-container sign-up-container">
        <form onSubmit={handleSubmit}>
          <h1>Create Account</h1>
          <input
            type="text"
            placeholder="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
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
          <input
            type="text"
            placeholder="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
          />
          <button type="submit">Sign Up</button>
        </form>
      </div>

          <div>
            <p>Already a user :</p>
            <Link to="/signup">
                <button >Log in</button>
              </Link>
          </div>
            

    </div>
  );
}

export default Signup;
