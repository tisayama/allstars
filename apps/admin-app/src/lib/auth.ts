/**
 * Authentication helper with token refresh logic
 * Monitors token expiration and refreshes proactively
 */

import { User } from 'firebase/auth';
import { auth } from './firebase';

const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current ID token, refreshing if near expiration
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // Check if token needs refresh
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now;

    // Force refresh if within threshold or explicitly requested
    const shouldRefresh = forceRefresh || timeUntilExpiry < TOKEN_REFRESH_THRESHOLD_MS;

    if (shouldRefresh) {
      console.log('🔄 Refreshing authentication token...');
      return await user.getIdToken(true);
    }

    return tokenResult.token;
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
}

/**
 * Check if the current user has admin privileges
 */
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;

  try {
    const tokenResult = await user.getIdTokenResult();
    // Check for admin claim (this should be set by the backend)
    return tokenResult.claims.admin === true;
  } catch (error) {
    console.error('Failed to check admin status:', error);
    return false;
  }
}

/**
 * Set up automatic token refresh
 * Returns a cleanup function to stop the refresh interval
 */
export function setupTokenRefresh(): () => void {
  const intervalId = setInterval(
    async () => {
      if (auth.currentUser) {
        await getIdToken(false);
      }
    },
    TOKEN_REFRESH_THRESHOLD_MS / 2 // Check twice as often as threshold
  );

  return () => clearInterval(intervalId);
}
