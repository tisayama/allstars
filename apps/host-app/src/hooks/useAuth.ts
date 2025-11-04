/**
 * useAuth Hook
 * Manages Firebase Authentication with session persistence and token refresh
 */

import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { HostUser } from '@allstars/types';

const STORAGE_KEY = 'host-auth';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

interface UseAuthReturn {
  user: HostUser | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Custom hook for Firebase Authentication
 * Provides Google login, session persistence, and automatic token refresh
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<HostUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Save user session to localStorage
   */
  const saveSession = useCallback((hostUser: HostUser) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hostUser));
    } catch (error) {
      logger.error(error as Error, { context: 'saveSession' });
    }
  }, []);

  /**
   * Clear user session from localStorage
   */
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error(error as Error, { context: 'clearSession' });
    }
  }, []);

  /**
   * Load user session from localStorage
   */
  const loadSession = useCallback((): HostUser | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as HostUser;

      // Check if token is expired
      if (parsed.tokenExpiresAt <= Date.now()) {
        clearSession();
        logger.auth.sessionExpired(parsed.email);
        return null;
      }

      return parsed;
    } catch (error) {
      logger.error(error as Error, { context: 'loadSession' });
      clearSession();
      return null;
    }
  }, [clearSession]);

  /**
   * Convert Firebase User to HostUser with token
   */
  const createHostUser = useCallback(
    async (firebaseUser: FirebaseUser): Promise<HostUser> => {
      const idToken = await firebaseUser.getIdToken();
      const tokenResult = await firebaseUser.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName,
        idToken,
        tokenExpiresAt: expirationTime,
      };
    },
    []
  );

  /**
   * Check if token needs refresh (within 5 minutes of expiry)
   */
  const shouldRefreshToken = useCallback((tokenExpiresAt: number): boolean => {
    const timeUntilExpiry = tokenExpiresAt - Date.now();
    return timeUntilExpiry < TOKEN_REFRESH_THRESHOLD;
  }, []);

  /**
   * Refresh user token
   */
  const refreshToken = useCallback(
    async (firebaseUser: FirebaseUser) => {
      try {
        const hostUser = await createHostUser(firebaseUser);
        setUser(hostUser);
        saveSession(hostUser);
        logger.auth.tokenRefreshed(hostUser.email);
      } catch (error) {
        logger.auth.tokenRefreshFailure(error as Error);
        // Don't clear session on refresh failure - token might still be valid
      }
    },
    [createHostUser, saveSession]
  );

  /**
   * Handle auth state changes from Firebase
   */
  const handleAuthStateChange = useCallback(
    async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const hostUser = await createHostUser(firebaseUser);
          setUser(hostUser);
          saveSession(hostUser);
          setIsLoading(false);

          // Set up token refresh check
          if (shouldRefreshToken(hostUser.tokenExpiresAt)) {
            await refreshToken(firebaseUser);
          }
        } catch (error) {
          logger.error(error as Error, { context: 'handleAuthStateChange' });
          setUser(null);
          clearSession();
          setIsLoading(false);
        }
      } else {
        setUser(null);
        clearSession();
        setIsLoading(false);
      }
    },
    [createHostUser, saveSession, clearSession, shouldRefreshToken, refreshToken]
  );

  /**
   * Login with Google
   */
  const login = useCallback(async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const hostUser = await createHostUser(result.user);
      setUser(hostUser);
      saveSession(hostUser);

      logger.auth.loginSuccess(hostUser.email);
    } catch (error) {
      logger.auth.loginFailure(error as Error);
      throw error;
    }
  }, [createHostUser, saveSession]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      clearSession();
      logger.auth.logoutSuccess(user?.email || 'unknown');
    } catch (error) {
      logger.auth.logoutFailure(error as Error);
      throw error;
    }
  }, [clearSession, user]);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    // Try to restore session from localStorage
    const storedSession = loadSession();
    if (storedSession) {
      setUser(storedSession);
      setIsLoading(false);
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    return () => unsubscribe();
  }, [loadSession, handleAuthStateChange]);

  /**
   * Set up automatic token refresh
   */
  useEffect(() => {
    if (!user) return;

    // Check if token needs refresh
    if (shouldRefreshToken(user.tokenExpiresAt)) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        refreshToken(currentUser);
      }
    }

    // Set up interval to check token expiry every minute
    const interval = setInterval(
      () => {
        if (shouldRefreshToken(user.tokenExpiresAt)) {
          const currentUser = auth.currentUser;
          if (currentUser) {
            refreshToken(currentUser);
          }
        }
      },
      60 * 1000
    ); // Check every minute

    return () => clearInterval(interval);
  }, [user, shouldRefreshToken, refreshToken]);

  return {
    user,
    isLoading,
    login,
    logout,
  };
}
