/**
 * useProjectorAuth Hook
 * Feature: 001-projector-auth [US1, US3]
 *
 * Manages automatic projector authentication with Firebase custom tokens
 * US3: Adds token refresh logic to support 8+ hour unattended operation (SC-004)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { fetchCustomToken } from '../services/authService';

export interface ProjectorAuthState {
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  error: string | null;
  firebaseToken: string | null;
  tokenExpiresAt: number | null;
  uid: string | null;
  refreshToken?: () => Promise<void>;
  needsRefresh?: () => boolean;
}

/**
 * Custom hook that automatically authenticates the projector app with Firebase
 * using a server-generated custom token
 *
 * @returns Authentication state including loading, error, and token information
 */
export function useProjectorAuth(): ProjectorAuthState {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate when token refresh should occur (US3)
   * - For tokens with > 10 min lifetime: refresh 5 minutes before expiration
   * - For tokens with < 10 min lifetime: refresh at 80% of lifetime
   */
  const calculateRefreshTime = useCallback((expiresAt: number): number => {
    const now = Date.now();
    const lifetime = expiresAt - now;
    const tenMinutes = 10 * 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    if (lifetime < tenMinutes) {
      // For short-lived tokens, refresh at 80% of lifetime
      return now + lifetime * 0.8;
    }

    // For normal tokens, refresh 5 minutes before expiration
    return expiresAt - fiveMinutes;
  }, []);

  /**
   * Check if token needs refresh (US3)
   */
  const needsRefresh = useCallback((): boolean => {
    if (!tokenExpiresAt) return false;

    const now = Date.now();
    const timeUntilExpiry = tokenExpiresAt - now;
    const fiveMinutes = 5 * 60 * 1000;

    return timeUntilExpiry < fiveMinutes;
  }, [tokenExpiresAt]);

  /**
   * Refresh the authentication token (US3)
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    const auth = getAuth();
    setError(null);

    try {
      // Fetch new custom token from API server
      const tokenData = await fetchCustomToken();
      setFirebaseToken(tokenData.token);
      setTokenExpiresAt(tokenData.expiresAt);
      setUid(tokenData.uid);

      // Sign in with new token
      await signInWithCustomToken(auth, tokenData.token);

      console.log(
        `[Auth] Token refreshed, expires at: ${new Date(tokenData.expiresAt).toISOString()}`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token refresh failed';
      setError(errorMessage);
      throw err; // Re-throw so caller can handle
    }
  }, []);

  /**
   * Schedule automatic token refresh (US3)
   */
  const scheduleRefresh = useCallback(
    (expiresAt: number) => {
      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      const refreshTime = calculateRefreshTime(expiresAt);
      const delayMs = refreshTime - Date.now();

      if (delayMs > 0) {
        console.log(`[Auth] Token refresh scheduled in ${Math.round(delayMs / 1000)}s`);

        refreshTimerRef.current = setTimeout(async () => {
          console.log('[Auth] Automatic token refresh triggered');
          try {
            await refreshToken();
          } catch (err) {
            console.error('[Auth] Automatic refresh failed:', err);
          }
        }, delayMs);
      }
    },
    [calculateRefreshTime, refreshToken]
  );

  useEffect(() => {
    const auth = getAuth();

    // Check if already authenticated
    if (auth.currentUser) {
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return;
    }

    // Start authentication flow
    const authenticate = async () => {
      setIsAuthenticating(true);
      setError(null);

      try {
        // Step 1: Fetch custom token from API server
        const tokenData = await fetchCustomToken();
        setFirebaseToken(tokenData.token);
        setTokenExpiresAt(tokenData.expiresAt);
        setUid(tokenData.uid);

        // Step 2: Sign in to Firebase with custom token
        await signInWithCustomToken(auth, tokenData.token);

        // Authentication successful
        setIsAuthenticated(true);
        setIsAuthenticating(false);

        // Schedule automatic refresh (US3)
        scheduleRefresh(tokenData.expiresAt);
      } catch (err) {
        // Authentication failed
        const errorMessage = err instanceof Error ? err.message : 'Unknown authentication error';
        setError(errorMessage);
        setIsAuthenticated(false);
        setIsAuthenticating(false);
      }
    };

    authenticate();

    // Cleanup: clear refresh timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleRefresh]); // Run once on mount

  // Re-schedule refresh when token expires time changes (after refresh)
  useEffect(() => {
    if (tokenExpiresAt && isAuthenticated) {
      scheduleRefresh(tokenExpiresAt);
    }
  }, [tokenExpiresAt, isAuthenticated, scheduleRefresh]);

  return {
    isAuthenticating,
    isAuthenticated,
    error,
    firebaseToken,
    tokenExpiresAt,
    uid,
    refreshToken,
    needsRefresh,
  };
}
