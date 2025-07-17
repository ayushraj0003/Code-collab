import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaArrowLeft, FaExclamationTriangle } from 'react-icons/fa';
import './AccessDenied.css';

const AccessDenied = ({ 
  error = 'You are not authorized to access this room',
  onRetry = null,
  showRetry = false 
}) => {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        <div className="access-denied-icon">
          <FaLock className="lock-icon" />
          <FaExclamationTriangle className="warning-icon" />
        </div>
        
        <h1 className="access-denied-title">Access Denied</h1>
        
        <p className="access-denied-message">
          {error}
        </p>
        
        <div className="access-denied-details">
          <p>This could happen if:</p>
          <ul>
            <li>You are not a member of this room</li>
            <li>You have been removed from the room</li>
            <li>The room no longer exists</li>
            <li>Your session has expired</li>
          </ul>
        </div>

        <div className="access-denied-actions">
          {showRetry && onRetry && (
            <button 
              className="retry-btn"
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
          
          <button 
            className="dashboard-btn"
            onClick={handleGoToDashboard}
          >
            <FaArrowLeft />
            Go to Dashboard
          </button>
          
          <button 
            className="back-btn"
            onClick={handleGoBack}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;