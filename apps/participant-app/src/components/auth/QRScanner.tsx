import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

/**
 * QR Code Scanner component using html5-qrcode library.
 *
 * Features:
 * - Camera access with permission handling
 * - File upload fallback (for devices without camera or HTTPS)
 * - Auto-cleanup on unmount
 *
 * Note: Camera access requires HTTPS in modern browsers.
 * Use ngrok or similar for mobile testing.
 */
export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>(
    'prompt'
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const elementId = 'qr-reader';

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch((err) => console.error('Failed to stop scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // Initialize scanner
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      // Start scanning with camera
      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);

          // Stop scanning after successful scan
          scanner
            .stop()
            .then(() => {
              setScanning(false);
            })
            .catch((err) => console.error('Failed to stop scanner:', err));
        },
        (errorMessage) => {
          // Error callback (runs frequently, don't log every frame)
          // Only log actual errors, not "No QR code found"
          if (!errorMessage.includes('No QR code found')) {
            console.warn('QR scan error:', errorMessage);
          }
        }
      );

      setCameraPermission('granted');
    } catch (err) {
      const error = err as Error;
      console.error('Failed to start QR scanner:', error);

      // Check if permission was denied
      if (error.message.includes('Permission') || error.message.includes('NotAllowed')) {
        setCameraPermission('denied');
        setError(
          'Camera permission denied. Please enable camera access in your browser settings or use file upload.'
        );
      } else if (error.message.includes('NotSecure') || error.message.includes('HTTPS')) {
        setError('Camera access requires HTTPS. Please use file upload fallback.');
      } else {
        setError(`Failed to access camera: ${error.message}`);
      }

      if (onScanError) {
        onScanError(error.message);
      }

      setScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setError(null);

      // Initialize scanner if not already
      const scanner = scannerRef.current || new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      // Scan file
      const decodedText = await scanner.scanFile(file, true);
      onScanSuccess(decodedText);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to scan QR code from file:', error);
      setError('Failed to read QR code from image. Please try again.');

      if (onScanError) {
        onScanError(error.message);
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current
        .stop()
        .then(() => {
          setScanning(false);
        })
        .catch((err) => console.error('Failed to stop scanner:', err));
    } else {
      setScanning(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Scanner container */}
      <div
        id={elementId}
        className="rounded-lg overflow-hidden border-2 border-primary mb-4"
        style={{ minHeight: scanning ? '300px' : '0px' }}
      />

      {/* Error message */}
      {error && (
        <div className="bg-error-light text-error-dark p-4 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        {!scanning ? (
          <>
            {/* Start camera button */}
            <button
              onClick={startScanning}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              style={{ minHeight: '44px' }}
            >
              Start Camera
            </button>

            {/* File upload fallback */}
            <div>
              <label
                htmlFor="qr-file-input"
                className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg text-center cursor-pointer transition-colors"
                style={{ minHeight: '44px' }}
              >
                Upload QR Code Image
              </label>
              <input
                id="qr-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <button
            onClick={stopScanning}
            className="w-full bg-error hover:bg-error-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            style={{ minHeight: '44px' }}
          >
            Stop Scanning
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="text-sm text-gray-600 text-center mt-4">
        {cameraPermission === 'denied'
          ? 'Camera access denied. Please use file upload or enable camera permissions.'
          : scanning
            ? 'Point your camera at the QR code'
            : 'Scan the QR code from the invitation or upload an image'}
      </p>
    </div>
  );
}
