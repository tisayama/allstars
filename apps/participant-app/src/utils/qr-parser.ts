/**
 * QR code URL parser for participant registration.
 *
 * Expected QR code URL format:
 * http://localhost:5173/join?token=qr_token_abc123xyz789
 * OR
 * https://allstars.app/join?token=qr_token_abc123xyz789
 */

/**
 * Parse QR code URL and extract guest token
 *
 * @param qrUrl - QR code URL string
 * @returns Extracted token or null if invalid
 */
export function parseQRCodeUrl(qrUrl: string): string | null {
  try {
    const url = new URL(qrUrl);

    // Normalize path by removing trailing slash
    const normalizedPath = url.pathname.replace(/\/$/, '');

    // Validate path
    if (normalizedPath !== '/join' && !normalizedPath.endsWith('/join')) {
      console.warn('Invalid QR code URL path:', url.pathname);
      return null;
    }

    // Extract token from query params
    const token = url.searchParams.get('token');

    if (!token) {
      console.warn('QR code URL missing token parameter');
      return null;
    }

    // Validate token format (basic validation)
    if (token.length < 10) {
      console.warn('Invalid token length:', token.length);
      return null;
    }

    return token;
  } catch (error) {
    console.error('Failed to parse QR code URL:', error);
    return null;
  }
}

/**
 * Validate token format
 *
 * @param token - Token string to validate
 * @returns True if token format is valid
 */
export function isValidToken(token: string): boolean {
  // Token should be at least 10 characters
  if (token.length < 10) {
    return false;
  }

  // Token should contain only alphanumeric and underscore
  const tokenRegex = /^[a-zA-Z0-9_-]+$/;
  return tokenRegex.test(token);
}

/**
 * Generate QR code URL for testing
 *
 * @param token - Guest token
 * @param baseUrl - Base URL (defaults to env var)
 * @returns Full QR code URL
 */
export function generateQRCodeUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || import.meta.env.VITE_PARTICIPANT_APP_URL || 'http://localhost:5173';
  return `${base}/join?token=${token}`;
}
