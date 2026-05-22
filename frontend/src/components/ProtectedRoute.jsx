import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { hasPersistedSession } from '../utils/authSession';

/**
 * Guards routes that require authentication (cookie session or Bearer tokens).
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();
  const hasSession = hasPersistedSession();

  if (bootstrapping) {
    if (!hasSession) {
      return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500 text-sm">
        Checking session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
