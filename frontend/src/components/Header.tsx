/**
 * IndAI — Header Component
 * Navigation bar with logo, user avatar, and navigation links.
 * Includes mobile hamburger menu for responsive design.
 */

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="header" id="main-header">
      <div className="header-inner">
        <Link to="/dashboard" className="header-logo" id="logo-link">
          <div className="logo-icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 2L3 8v12l11 6 11-6V8L14 2z"
                stroke="url(#logo-gradient)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M14 8l-5 3v6l5 3 5-3v-6l-5-3z"
                fill="url(#logo-gradient)"
                opacity="0.7"
              />
              <circle cx="14" cy="14" r="2" fill="#0a0e1a" />
              <defs>
                <linearGradient
                  id="logo-gradient"
                  x1="3"
                  y1="2"
                  x2="25"
                  y2="26"
                >
                  <stop stopColor="#00f0ff" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">
            Ind<span className="logo-accent">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="header-nav desktop-nav" id="main-nav">
          <Link
            to="/dashboard"
            className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
            id="nav-dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/scan"
            className={`nav-link ${isActive("/scan") ? "active" : ""}`}
            id="nav-scan"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Scan Code
          </Link>
        </nav>

        <div className="header-user" id="user-menu">
          {user?.avatar_url && (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="user-avatar"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="user-name">{user?.display_name}</span>
          <button
            onClick={logout}
            className="btn-logout"
            id="logout-button"
            title="Sign out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="logout-text">Sign Out</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className="mobile-menu-btn"
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu" id="mobile-menu">
          <div className="mobile-menu-user">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.display_name}
                className="mobile-avatar"
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <p className="mobile-user-name">{user?.display_name}</p>
              <p className="mobile-user-email">{user?.email}</p>
            </div>
          </div>

          <nav className="mobile-nav">
            <Link
              to="/dashboard"
              className={`mobile-nav-link ${isActive("/dashboard") ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
            <Link
              to="/scan"
              className={`mobile-nav-link ${isActive("/scan") ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Scan Code
            </Link>
          </nav>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="mobile-logout-btn"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
