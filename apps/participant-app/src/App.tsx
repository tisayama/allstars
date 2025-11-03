/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - React Router 6 type compatibility issue with React 18
/* eslint-enable @typescript-eslint/ban-ts-comment */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QRScanPage } from '@/pages/QRScanPage';
import { GamePage } from '@/pages/GamePage';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

/**
 * Main App component with routing
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/join" element={<QRScanPage />} />

        {/* Protected routes */}
        <Route
          path="/game"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />

        {/* Backward compatibility - redirect old /waiting to /game */}
        <Route path="/waiting" element={<Navigate to="/game" replace />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/join" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
