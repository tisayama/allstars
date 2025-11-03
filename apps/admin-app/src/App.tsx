/**
 * Main App component with routing and auth provider
 * Implements code splitting for better performance (T110)
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Lazy load pages for code splitting (T110)
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const QuizzesPage = lazy(() => import('@/pages/QuizzesPage').then(m => ({ default: m.QuizzesPage })));
const GuestsPage = lazy(() => import('@/pages/GuestsPage').then(m => ({ default: m.GuestsPage })));
const QRCodePrintPage = lazy(() => import('@/pages/QRCodePrintPage').then(m => ({ default: m.QRCodePrintPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner text="Loading page..." />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <AppShell>
                  <QuizzesPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests"
            element={
              <ProtectedRoute>
                <AppShell>
                  <GuestsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests/print"
            element={
              <ProtectedRoute>
                <QRCodePrintPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppShell>
                  <SettingsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
