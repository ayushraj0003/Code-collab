import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
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
      window.location.href='http://localhost:3000/dashboard';

      
      // Handle success (e.g., store token, redirect to dashboard)
    } catch (error) {
      // console.error('There was an error logging in: ', error.response.data);
      // Handle error (e.g., show error message)
    }
  };

  return (
    <div>
      <div className="left">
        <div className="head">
          <h1>LOGIN FORM</h1>
          <h4>Enter the details below</h4>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="name">
            <input
              type="text"
              placeholder="Enter name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
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
          <div className="number">
            <input
              type="text"
              placeholder="Enter Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
          </div>
   
          <button type="submit">Submit</button>
          <Link to="/signup"><a>Already a user</a></Link>
        </form>
      </div>
      <div className="right">
     
      </div>
    </div>
  );
}

export default Signup;
