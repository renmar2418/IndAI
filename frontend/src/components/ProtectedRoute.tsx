/**
 * IndAI — Protected Route Component
 * Guards routes that require authentication.
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-loader" id="auth-loader">
        <div className="loader-content">
          <div className="scanner-animation">
            <div className="scanner-ring" />
            <div className="scanner-ring delay-1" />
            <div className="scanner-ring delay-2" />
          </div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
