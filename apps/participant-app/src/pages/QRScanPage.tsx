import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRScanner } from '@/components/auth/QRScanner';
import { ManualTokenEntry } from '@/components/auth/ManualTokenEntry';
import { useAuth } from '@/hooks/useAuth';
import { parseQRCodeUrl } from '@/utils/qr-parser';

/**
 * QR Scan Page - Entry point for guest authentication
 *
 * Features:
 * - QR code scanning with camera
 * - Manual token entry fallback
 * - URL token parameter support (?token=...)
 * - Automatic redirect after successful authentication
 */
export function QRScanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { registerWithToken, loading, error, isAuthenticated } = useAuth();

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/game');
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle manual token submission
   */
  const handleTokenSubmit = useCallback(
    async (token: string) => {
      try {
        setRegistrationError(null);
        await registerWithToken(token);

        // Navigation will happen automatically via isAuthenticated effect
      } catch (err) {
        const error = err as Error;
        console.error('Registration failed:', error);

        // User-friendly error messages
        if (error.message.includes('Token not found')) {
          setRegistrationError(
            'Token not found. Please check your invitation or contact the host.'
          );
        } else if (error.message.includes('already registered')) {
          setRegistrationError(
            'This token has already been used on another device. Each guest can only join from one device.'
          );
        } else {
          setRegistrationError(
            error.message || 'Failed to join quiz. Please try again or contact the host.'
          );
        }
      }
    },
    [registerWithToken]
  );

  // Check for token in URL parameters
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      handleTokenSubmit(urlToken);
    }
  }, [searchParams, handleTokenSubmit]);

  /**
   * Handle QR code scan success
   */
  const handleScanSuccess = async (decodedText: string) => {
    console.warn('QR code scanned:', decodedText);

    // Parse QR code URL to extract token
    const token = parseQRCodeUrl(decodedText);

    if (!token) {
      setRegistrationError(
        'Invalid QR code. Please scan a valid invitation QR code or enter your token manually.'
      );
      setShowManualEntry(true);
      return;
    }

    await handleTokenSubmit(token);
  };

  /**
   * Handle scan error
   */
  const handleScanError = (errorMessage: string) => {
    console.warn('Scan error:', errorMessage);
    // Don't show manual entry automatically for every scan error
    // Only show if it's a camera permission/access issue
    if (
      errorMessage.includes('Permission') ||
      errorMessage.includes('NotAllowed') ||
      errorMessage.includes('HTTPS')
    ) {
      setShowManualEntry(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white py-6 px-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">AllStars Quiz</h1>
        <p className="text-sm text-center mt-1 opacity-90">Join the game</p>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Error message */}
          {(registrationError || error) && (
            <div
              className="bg-error-light text-error-dark p-4 rounded-lg mb-6 text-sm"
              role="alert"
            >
              <p className="font-semibold mb-1">Unable to join quiz</p>
              <p>{registrationError || error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center mb-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
              <p className="text-gray-600">Joining quiz...</p>
            </div>
          )}

          {/* QR Scanner or Manual Entry */}
          {!loading && (
            <>
              {showManualEntry ? (
                <>
                  <ManualTokenEntry onTokenSubmit={handleTokenSubmit} loading={loading} />

                  {/* Back to scanner button */}
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="w-full max-w-md mx-auto block text-primary hover:text-primary-dark text-sm font-medium mt-4 underline"
                  >
                    ← Back to QR scanner
                  </button>
                </>
              ) : (
                <>
                  <QRScanner onScanSuccess={handleScanSuccess} onScanError={handleScanError} />

                  {/* Manual entry toggle */}
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="w-full max-w-md mx-auto block text-primary hover:text-primary-dark text-sm font-medium mt-6 underline"
                  >
                    Enter token manually
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-500">
        <p>Powered by AllStars Platform</p>
        <p className="mt-1">Need help? Contact the host</p>
      </footer>
    </div>
  );
}
