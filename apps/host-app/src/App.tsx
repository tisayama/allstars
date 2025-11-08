/**
 * Root App component with routing
 * Defines routes for login and control panel
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { LoginPage } from '@/pages/LoginPage';
import { ControlPanel } from '@/pages/ControlPanel';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

function App(): ReactElement {
  return (
    <div data-testid="host-app">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/control"
            element={
              <ProtectedRoute>
                <ControlPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
