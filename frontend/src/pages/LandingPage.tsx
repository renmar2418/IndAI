/**
 * IndAI — Landing Page
 * Hero section with animated gradient background, Google sign-in button,
 * and feature showcase cards.
 */

import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function LandingPage() {
  const { login, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="loader-content">
          <div className="scanner-animation">
            <div className="scanner-ring" />
            <div className="scanner-ring delay-1" />
            <div className="scanner-ring delay-2" />
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing-page" id="landing-page">
      {/* Animated Background */}
      <div className="landing-bg">
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
        <div className="bg-orb orb-3" />
        <div className="bg-grid" />
      </div>

      {/* Hero Section */}
      <main className="landing-content">
        <div className="hero-section" id="hero-section">
          <div className="hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            AI-Powered Security Auditing
          </div>

          <h1 className="hero-title">
            <span className="title-line">Intelligent</span>
            <span className="title-line gradient-text">Detection AI</span>
          </h1>

          <p className="hero-description">
            Paste your code, detect vulnerabilities instantly, get auto-fixed results.
            Powered by 15 OWASP security rules with real-time analysis.
          </p>

          <button onClick={login} className="btn-google" id="google-login-button">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="hero-note">Free for students • No credit card required</p>
        </div>

        {/* Feature Cards */}
        <div className="features-grid" id="features-section">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: "rgba(0,240,255,0.1)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00f0ff" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Instant Scan</h3>
            <p>Paste your code and get vulnerability analysis in seconds. 15 OWASP rules scan simultaneously.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: "rgba(168,85,247,0.1)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3>Auto-Fix</h3>
            <p>Get corrected code with security patches applied automatically. Learn best practices instantly.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: "rgba(34,197,94,0.1)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7,10 12,15 17,10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h3>Extract Code</h3>
            <p>Download your corrected, vulnerability-free code with one click. Ready for production.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="landing-stats" id="stats-section">
          <div className="stat-item">
            <span className="stat-number">15</span>
            <span className="stat-label">Security Rules</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">OWASP</span>
            <span className="stat-label">Top 10 Coverage</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">8+</span>
            <span className="stat-label">Languages</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-number">&lt;1s</span>
            <span className="stat-label">Scan Time</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>IndAI — Intelligent Detection AI © 2026. Built for Code Security. By Gombio - Programmer/Developer</p>
      </footer>
    </div>
  );
}
