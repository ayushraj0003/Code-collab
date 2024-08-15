import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Dashboard() {
  const [userDetails, setUserDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        // Retrieve the JWT token from local storage
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No token found. Please log in.');
        }

        // Send the token in the Authorization header
        const response = await axios.get('http://localhost:5000/api/auth/details', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Set the user details in state
        setUserDetails(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching user details:', err);
      }
    };

    fetchUserDetails();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {error ? (
        <p>Error: {error}</p>
      ) : userDetails ? (
        <div>
          <p>Welcome, {userDetails.name}</p>
          <p>Email: {userDetails.email}</p>
          {/* Add other user details as needed */}
        </div>
      ) : (
        <p>Loading user details...</p>
      )}
    </div>
  );
}

export default Dashboard;
