import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// OTP Modal Component
const OTPModal = ({ isOpen, onClose, email, onVerify, onResend }) => {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await onVerify(otp);
      if (result.success) {
        setSuccess("OTP verified successfully!");
        setTimeout(() => {
          onClose();
          setOtp("");
          setError("");
          setSuccess("");
        }, 1500);
      } else {
        setError(result.message || "Invalid OTP");
      }
    } catch (error) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      await onResend();
      setSuccess("OTP sent successfully!");
      setOtp("");
    } catch (error) {
      setError("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOtp("");
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="otp-modal-overlay">
      <div className="otp-modal">
        <div className="otp-modal-header">
          <h2>
            <i className="fas fa-shield-alt"></i>
            Verify Your Email
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="otp-modal-body">
          <p className="otp-instruction">
            We've sent a 6-digit verification code to
            <br />
            <strong>{email}</strong>
          </p>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i> {success}
            </div>
          )}

          <div className="otp-input-container">
            <input
              type="text"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(value);
                setError("");
              }}
              placeholder="Enter 6-digit OTP"
              className="otp-input"
              maxLength="6"
              disabled={isLoading}
            />
          </div>

          <div className="otp-actions">
            <button
              className="verify-btn"
              onClick={handleVerify}
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Verifying...
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i> Verify OTP
                </>
              )}
            </button>

            <button
              className="resend-btn"
              onClick={handleResend}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Sending...
                </>
              ) : (
                <>
                  <i className="fas fa-redo"></i> Resend OTP
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function SignUpForm({ onToggleForm }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    avatar: "",
  });
  const [otpVerified, setOtpVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);

  const avatars = [
    "/images/avatar1.jpg",
    "/images/avatar2.jpg",
    "/images/avatar3.jpg",
    "/images/avatar4.jpg",
    "/images/avatar5.jpg",
    "/images/avatar6.jpg",
    "/images/avatar7.jpg",
    "/images/avatar8.jpg",
  ];

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear messages when user types
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleAvatarSelect = (avatar) => {
    setFormData({
      ...formData,
      avatar,
    });
  };

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.email.trim() &&
      formData.password.trim() &&
      formData.mobile.trim() &&
      formData.avatar
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Please enter your full name");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Please enter your email address");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!formData.password.trim()) {
      setError("Please enter a password");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (!formData.mobile.trim()) {
      setError("Please enter your mobile number");
      return false;
    }
    if (!/^\d{10}$/.test(formData.mobile)) {
      setError("Please enter a valid 10-digit mobile number");
      return false;
    }
    if (!formData.avatar) {
      setError("Please select an avatar");
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/api/auth/send-otp`, {
        email: formData.email,
      });
      setSuccess("Form validated! Opening OTP verification...");
      setTimeout(() => {
        setShowOTPModal(true);
        setSuccess("");
      }, 1000);
    } catch (error) {
      console.error("Failed to send OTP", error);
      setError(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-otp`, {
        email: formData.email,
        otp,
      });
      setOtpVerified(true);
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error("Failed to verify OTP", error);
      return {
        success: false,
        message: error.response?.data?.message || "Invalid OTP",
      };
    }
  };

  const handleResendOTP = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/send-otp`, {
        email: formData.email,
      });
    } catch (error) {
      throw new Error("Failed to resend OTP");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!otpVerified) {
      setError("Please verify your email with OTP first");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/register`,
        formData
      );
      const token = response.data.token;
      localStorage.setItem("token", token);
      setSuccess("Account created successfully! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error("Registration failed:", error.response?.data);
      setError(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="form-containers sign-up-container">
        <form onSubmit={handleSubmit} className="signup-form">
          <h1>Create Account</h1>

          {/* <div className="social-container">
            <a href="#" className="social" title="Continue with Facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#" className="social" title="Continue with Google">
              <i className="fab fa-google-plus-g" />
            </a>
            <a href="#" className="social" title="Continue with LinkedIn">
              <i className="fab fa-linkedin-in" />
            </a>
          </div>

          <span>or use your email for registration</span> */}

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <i className="fas fa-check-circle"></i> {success}
            </div>
          )}

          {otpVerified && (
            <div className="verified-badge">
              <i className="fas fa-check-circle"></i> Email Verified
            </div>
          )}

          <div className="form-row">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name *"
              required
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email Address *"
              required
              disabled={isLoading || otpVerified}
              className="form-input"
            />
          </div>

          <div className="form-row password-row">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password (min 6 characters) *"
              required
              disabled={isLoading}
              className="form-input"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>

          <div className="form-row">
            <input
              type="tel"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Mobile Number (10 digits) *"
              maxLength="10"
              required
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="avatar-selection">
            <p className="avatar-label">
              <i className="fas fa-user-circle"></i> Choose Your Avatar: *
            </p>
            <div className="avatar-grid">
              {avatars.map((avatar, index) => (
                <img
                  key={index}
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className={`avatar ${
                    formData.avatar === avatar ? "selected" : ""
                  }`}
                  onClick={() => !isLoading && handleAvatarSelect(avatar)}
                  loading="lazy"
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            {!otpVerified ? (
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={!isFormValid() || isLoading}
                className="send-otp-btn"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Sending OTP...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i> Send OTP
                  </>
                )}
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="signup-btn">
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Creating
                    Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i> Create Account
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mobile Toggle Button */}
          <div className="mobile-form-toggle">
            <span>Already have an account?</span>
            <button
              type="button"
              onClick={onToggleForm}
              className="toggle-form-btn"
            >
              Sign In <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </form>
      </div>

      <OTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={formData.email}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
      />
    </>
  );
}

export default SignUpForm;
