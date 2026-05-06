import { useState, useEffect, useRef, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiService from "../services/api";

type AuthStep = "email" | "otp";
type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { setTokenAndFetch, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // ── Countdown Timer ──────────────────────────────────────────
  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── OTP Input Handlers ──────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all digits are filled
    if (newDigits.every(d => d !== "") && newDigits.length === 6) {
      // Small delay to ensure state update is reflected
      setTimeout(() => handleVerifyOtp(undefined, newDigits.join("")), 10);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setOtpDigits(newDigits);

    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    // Auto-verify if 6 digits were pasted
    if (pastedData.length === 6) {
      setTimeout(() => handleVerifyOtp(undefined, pastedData), 10);
    }
  };

  // ── Send OTP ────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const purpose = mode === "register" ? "register" : "login";
      const response = await apiService.sendOtp(email.trim(), purpose);

      if (response.success) {
        setStep("otp");
        setOtpDigits(["", "", "", "", "", ""]);
        startCountdown(response.data?.remaining_seconds || 180);
        setSuccessMsg(`Verification code sent to ${email.trim()}`);

        // Auto-focus first OTP input after render
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "";

      if (err.response?.data?.error_code === "EMAIL_EXISTS") {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (err.response?.data?.error_code === "USER_NOT_FOUND") {
        setError("No account found with this email. Please register first.");
      } else if (err.response?.data?.error_code === "OTP_COOLDOWN") {
        setError("A code was just sent. Please wait a moment before requesting another.");
      } else if (err.response?.status === 429) {
        setError("Too many requests. Please wait a few minutes before trying again.");
      } else {
        setError(serverMsg || "We couldn't send the verification code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent, overrideCode?: string) => {
    if (e) e.preventDefault();
    setError("");

    const code = overrideCode || otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setIsSubmitting(true);

    try {
      const purpose = mode === "register" ? "register" : "login";
      const response = await apiService.verifyOtp(email.trim(), code, purpose);

      if (response.success && response.token) {
        await setTokenAndFetch(response.token);
        navigate("/dashboard");
      }
    } catch (err: any) {
      const errorCode = err.response?.data?.error_code;
      const serverMsg = err.response?.data?.message || "";
      const remaining = err.response?.data?.details?.remaining_attempts;

      if (errorCode === "OTP_EXPIRED") {
        setError("This code has expired. Please request a new one.");
        setCountdown(0);
      } else if (errorCode === "OTP_INVALID") {
        const attemptMsg = remaining !== undefined ? ` (${remaining} attempts remaining)` : "";
        setError(`Incorrect code. Please check your email and try again.${attemptMsg}`);
      } else if (errorCode === "OTP_LOCKED") {
        setError("Too many incorrect attempts. Please request a new code.");
      } else if (errorCode === "OTP_NOT_FOUND") {
        setError("No verification code found. Please request a new one.");
      } else {
        setError(serverMsg || "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────
  const handleResendOtp = async () => {
    setError("");
    setSuccessMsg("");
    setResendCooldown(30);

    // 30-second cooldown for the resend button itself
    const cooldownInterval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const purpose = mode === "register" ? "register" : "login";
      const response = await apiService.resendOtp(email.trim(), purpose);

      if (response.success) {
        setOtpDigits(["", "", "", "", "", ""]);
        startCountdown(response.data?.remaining_seconds || 180);
        setSuccessMsg("A new code has been sent to your email.");
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || "";
      if (err.response?.status === 429) {
        setError("Too many resend attempts. Please wait a few minutes.");
      } else {
        setError(serverMsg || "We couldn't resend the code. Please try again.");
      }
    }
  };

  // ── Switch Mode ─────────────────────────────────────────────
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setStep("email");
    setError("");
    setSuccessMsg("");
    setOtpDigits(["", "", "", "", "", ""]);
    setCountdown(0);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // ── Google & Facebook Login ─────────────────────────────────
  const handleGoogleLogin = () => {
    const loginUrl = apiService.getGoogleLoginUrl();
    fetch(loginUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.auth_url) window.location.href = data.auth_url;
      })
      .catch(() => setError("Google login failed to initialize"));
  };

  const handleFacebookLogin = () => {
    const loginUrl = apiService.getFacebookLoginUrl();
    fetch(loginUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.auth_url) window.location.href = data.auth_url;
      })
      .catch(() => setError("Facebook login failed to initialize"));
  };

  // ── Render ──────────────────────────────────────────────────
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
          {step === "email" ? (
            <>
              <h1 className="auth-title">
                {mode === "register" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="auth-subtitle">
                {mode === "register"
                  ? "Enter your email to get started with IndAI."
                  : "Sign in to your IndAI account."}
              </p>

              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === "login" ? "active" : ""}`}
                  onClick={() => switchMode("login")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${mode === "register" ? "active" : ""}`}
                  onClick={() => switchMode("register")}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="auth-error-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="auth-form">
                <div className="input-group">
                  <input
                    id="auth-email-input"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="auth-input"
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting}
                  id="auth-send-otp-btn"
                >
                  {isSubmitting ? (
                    <span className="auth-btn-loading">
                      <span className="auth-spinner" />
                      Sending code...
                    </span>
                  ) : (
                    <>
                      Continue with Email
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 8 }}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <div className="auth-divider">
                <span>or continue with</span>
              </div>

              <div className="social-login-group">
                <button className="social-btn facebook" type="button" onClick={handleFacebookLogin}>
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
            </>
          ) : (
            /* ── OTP Verification Step ──────────────────────────── */
            <>
              <button
                className="auth-back-btn"
                onClick={() => { setStep("email"); setError(""); setSuccessMsg(""); }}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              <div className="otp-email-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="url(#mailGrad)" strokeWidth="1.5" />
                  <path d="M2 7l8.165 5.715a3 3 0 003.67 0L22 7" stroke="url(#mailGrad)" strokeWidth="1.5" />
                  <defs>
                    <linearGradient id="mailGrad" x1="2" y1="4" x2="22" y2="20">
                      <stop offset="0%" stopColor="#00f0ff" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <h1 className="auth-title">Check your email</h1>
              <p className="auth-subtitle">
                We sent a verification code to<br />
                <strong className="otp-email-highlight">{email}</strong>
              </p>

              {error && (
                <div className="auth-error-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="auth-success-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="otp-input-group">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={`otp-digit-input ${digit ? "filled" : ""}`}
                      autoComplete="one-time-code"
                      id={`otp-digit-${index}`}
                    />
                  ))}
                </div>

                {/* Countdown Timer */}
                <div className="otp-timer-section">
                  {countdown > 0 ? (
                    <div className="otp-timer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>Code expires in <strong className="otp-timer-value">{formatCountdown(countdown)}</strong></span>
                    </div>
                  ) : (
                    <div className="otp-timer otp-timer-expired">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>Code expired</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={isSubmitting || otpDigits.join("").length !== 6 || countdown === 0}
                  id="auth-verify-otp-btn"
                >
                  {isSubmitting ? (
                    <span className="auth-btn-loading">
                      <span className="auth-spinner" />
                      Verifying...
                    </span>
                  ) : (
                    "Verify & Continue"
                  )}
                </button>
              </form>

              {/* Resend Section */}
              <div className="otp-resend-section">
                <p className="otp-resend-text">Didn't receive the code?</p>
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0}
                  id="auth-resend-otp-btn"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"
                  }
                </button>
              </div>

              <p className="otp-help-text">
                Check your spam folder if you don't see the email.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
