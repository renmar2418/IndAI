/**
 * IndAI — Main Application Component
 * Sets up routing with React Router and wraps everything in AuthProvider.
 * Includes: ErrorBoundary, ToastProvider, 404, Keyboard Shortcuts.
 */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./components/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import AgenticWidget from "./components/AgenticWidget";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ScanPage from "./pages/ScanPage";
import ScanDetailPage from "./pages/ScanDetailPage";
import CallbackPage from "./pages/CallbackPage";
import NotFoundPage from "./pages/NotFoundPage";

/** Widget wrapper — only shows when user is authenticated */
function AuthenticatedWidget() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;
  return <AgenticWidget />;
}

/** Global keyboard shortcuts */
function KeyboardShortcuts() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isAuthenticated) return;
      // Don't trigger in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      // Ctrl+Shift+I → Toggle AI Assistant
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        const toggle = document.getElementById("agent-toggle");
        if (toggle) toggle.click();
        return;
      }

      // Ctrl+Shift+K → Clear code editor (only on scan page)
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        const clearBtn = document.getElementById("clear-code-button");
        if (clearBtn) clearBtn.click();
        return;
      }

      // Skip remaining shortcuts if user is in an input
      if (isInput) return;

      // Ctrl+Enter → Scan code
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const scanBtn = document.getElementById("scan-button");
        if (scanBtn && !scanBtn.hasAttribute("disabled")) scanBtn.click();
        return;
      }

      // Alt+D → Dashboard
      if (e.altKey && e.key === "d") {
        e.preventDefault();
        navigate("/dashboard");
      }

      // Alt+S → Scan page
      if (e.altKey && e.key === "s") {
        e.preventDefault();
        navigate("/scan");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ErrorBoundary>
            <div className="app-shell" id="app-shell">
              <Header />
              <KeyboardShortcuts />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/callback" element={<CallbackPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scan"
                  element={
                    <ProtectedRoute>
                      <ScanPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scan/:scanId"
                  element={
                    <ProtectedRoute>
                      <ScanDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>

              {/* Floating AI Assistant — visible on all pages when logged in */}
              <AuthenticatedWidget />
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
