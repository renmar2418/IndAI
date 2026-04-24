/**
 * IndAI — Auth Context
 * React Context for authentication state management.
 * Provides user data, login/logout methods, and auth status.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "../types";
import apiService from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  setTokenAndFetch: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("indai_token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.getAuthStatus();
      if (response.authenticated) {
        setUser(response.user);
      } else {
        localStorage.removeItem("indai_token");
        setUser(null);
      }
    } catch {
      localStorage.removeItem("indai_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-validate auth when user switches back to this tab
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && localStorage.getItem("indai_token")) {
        checkAuth();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [checkAuth]);

  const login = useCallback(() => {
    // Redirect to Google OAuth via our backend
    const loginUrl = apiService.getGoogleLoginUrl();
    // We fetch the URL from the API to get the full auth URL
    fetch(loginUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.auth_url) {
          window.location.href = data.auth_url;
        }
      })
      .catch((err) => {
        console.error("Failed to get auth URL:", err);
      });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } finally {
      setUser(null);
      localStorage.removeItem("indai_token");
    }
  }, []);

  const setTokenAndFetch = useCallback(async (token: string) => {
    localStorage.setItem("indai_token", token);
    setIsLoading(true);
    try {
      const response = await apiService.getAuthStatus();
      if (response.authenticated) {
        setUser(response.user);
      }
    } catch {
      localStorage.removeItem("indai_token");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setTokenAndFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
