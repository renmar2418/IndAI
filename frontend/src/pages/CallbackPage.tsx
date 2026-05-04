/**
 * IndAI — OAuth Callback Page
 * Handles the redirect from Google OAuth.
 * Extracts the token from URL params and stores it.
 *
 * Note: Google's 2-Step Verification (Google Prompt) is handled by Google
 * during the OAuth consent screen BEFORE this callback is reached.
 * If the user has 2SV enabled, Google already verified them via phone prompt.
 */

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenAndFetch } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    if (token) {
      setTokenAndFetch(token).then((user) => {
        if (user?.role === 'admin') {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      });
    } else {
      setError("No token received. Please try logging in again.");
      setTimeout(() => navigate("/"), 3000);
    }
  }, [searchParams, navigate, setTokenAndFetch]);

  if (error) {
    return (
      <div className="callback-page" id="callback-page">
        <div className="callback-content error">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>{error}</h2>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-page" id="callback-page">
      <div className="callback-content">
        <div className="scanner-animation">
          <div className="scanner-ring" />
          <div className="scanner-ring delay-1" />
          <div className="scanner-ring delay-2" />
        </div>
        <h2>Authenticating...</h2>
        <p>Google verified your identity successfully</p>
      </div>
    </div>
  );
}
