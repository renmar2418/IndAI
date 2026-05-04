/**
 * IndAI — Landing Page
 * Hero section with animated gradient background, Google sign-in button,
 * and feature showcase cards.
 */

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [demoState, setDemoState] = useState<"idle" | "scanning" | "done">("idle");

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

      {/* Top Navigation */}
      <nav className="landing-nav" style={{ 
        position: "absolute", 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 50,
        padding: "20px 0"
      }}>
        <div className="container" style={{ 
          maxWidth: "1200px", 
          margin: "0 auto", 
          padding: "0 40px",
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center"
        }}>
          <div className="landing-logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 2L3 8v12l11 6 11-6V8L14 2z" stroke="url(#nav-grad)" strokeWidth="2" />
                <path d="M14 8l-5 3v6l5 3 5-3v-6l-5-3z" fill="url(#nav-grad)" opacity="0.7" />
                <circle cx="14" cy="14" r="2" fill="#0A0F1E" />
                <defs>
                  <linearGradient id="nav-grad" x1="3" y1="2" x2="25" y2="26">
                    <stop stopColor="#00f0ff" />
                    <stop offset="1" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span className="logo-text" style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Ind<span className="logo-accent" style={{ color: "var(--accent-cyan)" }}>AI</span></span>
          </div>
          <div className="nav-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button 
              onClick={() => navigate("/demo")} 
              className="btn-demo-nav" 
              style={{ 
                background: "rgba(168, 85, 247, 0.1)", 
                border: "2px solid var(--accent-purple)",
                color: "var(--accent-purple)",
                padding: "8px 20px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                transition: "all 0.2s",
                boxShadow: "0 4px 12px rgba(168, 85, 247, 0.15)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--accent-purple)";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "var(--accent-purple)";
              }}
            >
              Try Demo
            </button>
            <button 
              onClick={() => navigate("/auth")} 
              className="btn-primary"
              style={{ padding: "8px 24px", borderRadius: "8px" }}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

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
            Powered by OWASP security rules with real-time analysis.
          </p>

          <button onClick={() => navigate('/auth')} className="btn-google" id="google-login-button" style={{ background: "var(--accent-cyan)", color: "#000", fontWeight: "600" }}>
            Get Started Free
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
            <p>Paste your code and get vulnerability analysis in seconds. OWASP rules scan simultaneously.</p>
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

        {/* Demo Section */}
        <div className="demo-section" id="demo-section" style={{ padding: "80px 20px", textAlign: "center", maxWidth: "1000px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--text-primary)" }}>See it in action</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "40px" }}>Try a simulated scan to see how IndAI detects and fixes vulnerabilities.</p>
          
          <div className="demo-container" style={{ background: "rgba(20,20,30,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px", textAlign: "left" }}>
            
            {/* Code Editor Mock */}
            <div className="demo-editor" style={{ background: "#0d1117", borderRadius: "8px", border: "1px solid #30363d", overflow: "hidden" }}>
              <div className="demo-header" style={{ background: "#161b22", padding: "10px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #30363d" }}>
                <span style={{ display: "flex", gap: "6px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f56" }}></div>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e" }}></div>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#27c93f" }}></div>
                </span>
                <span style={{ color: "#8b949e", fontSize: "12px", fontFamily: "monospace" }}>app.js</span>
              </div>
              <pre style={{ padding: "20px", margin: 0, color: "#c9d1d9", fontFamily: "monospace", fontSize: "14px", overflowX: "auto" }}>
                <code>
                  {demoState === "done" ? (
                    <span style={{ color: "#7ee787" }}>// FIXED: Parameterized query to prevent SQL Injection{'\n'}</span>
                  ) : null}
                  <span style={{ color: "#ff7b72" }}>const</span> query = <span style={{ color: "#a5d6ff" }}>"SELECT * FROM users WHERE username = '"</span> + req.body.username + <span style={{ color: "#a5d6ff" }}>"'"</span>;{'\n'}
                  db.execute(query);
                </code>
              </pre>
            </div>

            {/* Demo Controls */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              {demoState === "idle" && (
                <button 
                  onClick={() => {
                    setDemoState("scanning");
                    setTimeout(() => setDemoState("done"), 2000);
                  }}
                  style={{ background: "var(--accent-purple)", color: "#fff", padding: "12px 24px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Scan Code
                </button>
              )}
              
              {demoState === "scanning" && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-cyan)" }}>
                  <div className="spinner" style={{ width: "20px", height: "20px", border: "3px solid rgba(0,240,255,0.2)", borderTopColor: "var(--accent-cyan)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                  Analyzing for vulnerabilities...
                </div>
              )}

              {demoState === "done" && (
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "12px 20px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    SQL Injection Detected
                  </div>
                  <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#22c55e", padding: "12px 20px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Auto-Fix Applied
                  </div>
                  <button onClick={() => setDemoState("idle")} style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>Reset Demo</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <p>IndAI — Intelligent Detection AI © 2026. Built for Code Security. By Gombio - Programmer/Developer</p>
        <div style={{ display: 'flex', gap: '24px', fontSize: '0.85rem' }}>
          <a href="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--accent-cyan)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--accent-cyan)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
