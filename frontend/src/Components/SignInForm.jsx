import { useState } from "react";
import axios from "axios";
import React from "react";
import { useNavigate } from "react-router-dom";

function SignInForm({ onToggleForm }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, formData);
      console.log("Login successful: ", response.data);
      const token = response.data.token;
      localStorage.setItem("token", token);
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("There was an error logging in: ", error.response?.data);

      // Handle different types of errors
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "";

        if (status === 401) {
          // Unauthorized - wrong password or email
          if (message.toLowerCase().includes("password")) {
            setError("Incorrect password. Please try again.");
          } else if (
            message.toLowerCase().includes("email") ||
            message.toLowerCase().includes("user")
          ) {
            setError("Email not found. Please check your email or sign up.");
          } else {
            setError("Invalid email or password. Please try again.");
          }
        } else if (status === 400) {
          setError(
            "Invalid login credentials. Please check your email and password."
          );
        } else if (status === 429) {
          setError("Too many login attempts. Please try again later.");
        } else if (status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(message || "Login failed. Please try again.");
        }
      } else if (error.request) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-containers sign-in-container">
      <form onSubmit={handleSubmit} className="sign-in-form">
        <h1>Sign in</h1>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="success-message">
            <i className="fas fa-check-circle"></i> {success}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={isLoading}
          className={error && error.includes("email") ? "error-input" : ""}
        />

        <div className="password-input-container">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLoading}
            className={
              error && error.toLowerCase().includes("password")
                ? "error-input"
                : ""
            }
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
            disabled={isLoading}
          >
            <i
              className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
            ></i>
          </button>
        </div>

        <a href="#" onClick={(e) => e.preventDefault()}>
          Forgot your password?
        </a>

        <button type="submit" className="ghost1" disabled={isLoading}>
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Mobile Toggle Button */}
        <div className="mobile-form-toggle">
          <span>Don't have an account?</span>
          <button
            type="button"
            onClick={onToggleForm}
            className="toggle-form-btn"
          >
            Sign Up <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </form>
    </div>
  );
}

export default SignInForm;
