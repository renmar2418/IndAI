/**
 * IndAI — Main Application Component
 * Sets up routing with React Router and wraps everything in AuthProvider.
 * Includes: ErrorBoundary, ToastProvider, 404, Keyboard Shortcuts.
 */

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { BackgroundScanProvider } from "./context/BackgroundScanContext";
import AgenticWidget from "./components/AgenticWidget";
import UserLayout from "./components/UserLayout";
import AdminLayout from "./components/AdminLayout";
import LandingPage from "./pages/LandingPage";
import DemoPage from "./pages/DemoPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import ScanPage from "./pages/ScanPage";
import ScanDetailPage from "./pages/ScanDetailPage";
import CallbackPage from "./pages/CallbackPage";
import NotFoundPage from "./pages/NotFoundPage";
import ShareSnippetPage from "./pages/ShareSnippetPage";
import ViewSnippetPage from "./pages/ViewSnippetPage";
import QuickSharePage from "./pages/QuickSharePage";
import GitHubPage from "./pages/GitHubPage";
import AdminPage from "./pages/AdminPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminAuditLogPage from "./pages/AdminAuditLogPage";
import AdminConfigPage from "./pages/AdminConfigPage";
import AdminAlertsPage from "./pages/AdminAlertsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { AdminRoute } from "./components/AdminRoute";

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
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BackgroundScanProvider>
            <ErrorBoundary>
              <KeyboardShortcuts />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/callback" element={<CallbackPage />} />
                <Route path="/s/:shortId" element={<ViewSnippetPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />

                {/* Admin Portal (Isolated Shell) */}
                <Route element={<AdminRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/config" element={<AdminConfigPage />} />
                    <Route path="/admin/audit" element={<AdminAuditLogPage />} />
                    <Route path="/admin/alerts" element={<AdminAlertsPage />} />
                  </Route>
                </Route>

                {/* User App (Standard Shell) */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<UserLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/scan" element={<ScanPage />} />
                    <Route path="/scan/:scanId" element={<ScanDetailPage />} />
                    <Route path="/github" element={<GitHubPage />} />
                    <Route path="/share" element={<ShareSnippetPage />} />
                    <Route path="/quickshare" element={<QuickSharePage />} />
                  </Route>
                </Route>

                {/* 404 Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>

              {/* Floating AI Assistant — visible on all pages when logged in */}
              <AuthenticatedWidget />
            </ErrorBoundary>
          </BackgroundScanProvider>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
