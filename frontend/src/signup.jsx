import React, { useState } from "react";
import { Link } from "react-router-dom";


function Signup(){
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

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Form Data Submitted: ", formData);
   
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
          <Link to="/"><a>Already a user</a></Link>
        </form>
      </div>
      <div className="right">
     
      </div>
    </div>
  );
}

export default Signup
