/**
 * Firebase Auth token verification
 * FR-002: Clients MUST authenticate within 10 seconds
 * FR-008: Server MUST reject invalid/expired tokens
 */
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

export interface TokenVerificationResult {
  userId: string | null;
  isValid: boolean;
  error?: string;
}

/**
 * Verify Firebase Auth ID token and extract user ID
 * @param token - Firebase Auth ID token (JWT format)
 * @returns Verification result with userId if valid, error message if invalid
 */
export async function verifyAuthToken(token: string): Promise<TokenVerificationResult> {
  // Input validation
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return {
      userId: null,
      isValid: false,
      error: 'Invalid token format',
    };
  }

  try {
    // Verify token with Firebase Admin SDK
    // checkRevoked: true ensures token hasn't been revoked
    const decodedToken = await admin.auth().verifyIdToken(token, true);

    logger.debug(`Token verified for user: ${decodedToken.uid}`);

    return {
      userId: decodedToken.uid,
      isValid: true,
    };
  } catch (error) {
    // Extract error message for logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.warn(`Token verification failed: ${errorMessage}`);

    return {
      userId: null,
      isValid: false,
      error: errorMessage,
    };
  }
}
