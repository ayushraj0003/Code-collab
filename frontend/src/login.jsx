import React, { useState } from "react";
import { Link } from "react-router-dom";

import axios from "axios";
function Login(){
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
      console.log('Signup successful: ', response.data);
      const token = response.data.token;
      localStorage.setItem('token', token);
      window.location.href='http://localhost:3000/dashboard';
      // Handle success (e.g., redirect to login page or show success message)
    } catch (error) {
      console.error('There was an error signing up: ', error.response.data);
      // Handle error (e.g., show error message)
    }
  };
  return (
    <div>
      <div className="left">
        <div className="head">
          <h1>SIGNUP</h1>
          <h4>Enter the details below</h4>
        </div>
        <form onSubmit={handleSubmit}>

          <div className="email">
            <input
              type="email"
              placeholder="Enter Email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div className="pass">
            <input
              type="password"
              placeholder="Enter Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

   
          <button type="submit">Submit</button>
          <Link to="/"><a>Create a new account</a></Link>
        </form>
      </div>
      <div className="right">
     
      </div>
    </div>
  );
}

export default Login
