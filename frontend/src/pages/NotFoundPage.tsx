/**
 * IndAI — 404 Not Found Page
 */

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="error-boundary" id="not-found-page">
      <div className="error-boundary-card">
        <div className="error-boundary-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2>404 — Page Not Found</h2>
        <p className="error-boundary-msg">The page you're looking for doesn't exist or has been moved.</p>
        <div className="error-boundary-actions">
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
          <Link to="/scan" className="confirm-btn-keep" style={{ textDecoration: "none", textAlign: "center" }}>Scan Code</Link>
        </div>
      </div>
    </div>
  );
}
