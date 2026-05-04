import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginWithCredentials, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateRegistration = () => {
    if (!email || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (username.length < 8 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username must be at least 8 characters and contain only letters, numbers, and underscores.");
      return false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters, include an uppercase letter, a number, and a special character.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    return true;
  };

  const validateLogin = () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email/username and password.");
      return false;
    }
    if (email.trim().length < 8) {
      setError("Email or username must be at least 8 characters.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (activeTab === "login") {
        if (!validateLogin()) { setIsSubmitting(false); return; }
        await loginWithCredentials(email, password);
        navigate("/dashboard");
      } else {
        if (!validateRegistration()) { setIsSubmitting(false); return; }
        const { token } = await apiService.register({
          email: email,
          password: password,
          username: username,
        });
        localStorage.setItem("indai_token", token);
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (activeTab === "login") {
        setError("Invalid username/email or password.");
      } else {
        const serverMsg = err.response?.data?.error || err.response?.data?.message || "";
        setError(serverMsg || "Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    const loginUrl = apiService.getGoogleLoginUrl();
    fetch(loginUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.auth_url) window.location.href = data.auth_url;
      })
      .catch(() => setError("Google login failed to initialize"));
  };

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="landing-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-grid" />
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Login or Register</h1>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
              onClick={() => { setActiveTab("login"); setError(""); }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${activeTab === "register" ? "active" : ""}`}
              onClick={() => { setActiveTab("register"); setError(""); }}
            >
              Register
            </button>
          </div>

          {error && (
            <div style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "500",
              textAlign: "center",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {activeTab === "login" ? (
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Email, Phone Number, or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                />
              </div>
            ) : (
              <>
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                  />
                </div>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                  />
                </div>
              </>
            )}

            <div className="input-group" style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="password-toggle-btn"
                style={{ 
                  position: "absolute", 
                  right: "12px", 
                  top: "50%", 
                  transform: "translateY(-50%)", 
                  background: "none", 
                  border: "none", 
                  cursor: "pointer", 
                  color: "var(--text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            {activeTab === "register" && (
              <div className="input-group" style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="auth-input"
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="password-toggle-btn"
                  style={{ 
                    position: "absolute", 
                    right: "12px", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer", 
                    color: "var(--text-muted)",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center"
                  }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {activeTab === "login" && (
              <div className="forgot-password-link">
                <a href="#">Forgot Password</a>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {activeTab === "login" ? "Login" : "Register"}
            </button>
          </form>

          <div className="auth-divider">
            <span>You can also use</span>
          </div>

          <div className="social-login-group">
            <button className="social-btn facebook" type="button" onClick={() => {
              const loginUrl = apiService.getFacebookLoginUrl();
              fetch(loginUrl)
                .then((res) => res.json())
                .then((data) => {
                  if (data.auth_url) window.location.href = data.auth_url;
                })
                .catch(() => setError("Facebook login failed to initialize"));
            }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
              </svg>
              Facebook
            </button>
            <button className="social-btn google" type="button" onClick={handleGoogleLogin}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>

          <p className="auth-terms">
            By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy-policy">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
