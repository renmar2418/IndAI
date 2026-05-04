import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { showToast } = useToast();

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div className="scan-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    // We must use a timeout here because we can't show a toast during render
    setTimeout(() => {
      showToast("You do not have permission to access the Admin Dashboard.", "error");
    }, 0);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
