import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const useRoomAccess = (roomId) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const verifyRoomAccess = async () => {
      if (!roomId) {
        setError('No room ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication required');
          setIsLoading(false);
          navigate('/login');
          return;
        }

        console.log(`Verifying access to room: ${roomId}`);

        const response = await axios.get(
          `${API_URL}/api/rooms/${roomId}/verify-access`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setHasAccess(true);
          setRoomData(response.data.room);
          console.log('Room access verified successfully');
        } else {
          setHasAccess(false);
          setError(response.data.message || 'Access denied');
        }

      } catch (error) {
        console.error('Room access verification failed:', error);
        
        if (error.response?.status === 403) {
          setError('You are not authorized to access this room');
          setHasAccess(false);
          
          // Redirect to dashboard after showing error
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          
        } else if (error.response?.status === 404) {
          setError('Room not found');
          setHasAccess(false);
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
          
        } else if (error.response?.status === 401) {
          setError('Authentication failed');
          localStorage.removeItem('token');
          navigate('/login');
          
        } else {
          setError('Failed to verify room access');
          setHasAccess(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyRoomAccess();
  }, [roomId, navigate, API_URL]);

  const retryAccess = () => {
    setIsLoading(true);
    setError(null);
    setHasAccess(false);
    
    // Re-run the verification
    const verifyRoomAccess = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${API_URL}/api/rooms/${roomId}/verify-access`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          setHasAccess(true);
          setRoomData(response.data.room);
        } else {
          setHasAccess(false);
          setError(response.data.message || 'Access denied');
        }
      } catch (error) {
        setError('Failed to verify room access');
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyRoomAccess();
  };

  return {
    isLoading,
    hasAccess,
    roomData,
    error,
    retryAccess
  };
};

export default useRoomAccess;