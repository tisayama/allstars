import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected Route wrapper that requires authentication.
 *
 * Redirects to QR scan page if user is not authenticated.
 * Shows loading spinner while checking authentication state.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to QR scan if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/join" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
