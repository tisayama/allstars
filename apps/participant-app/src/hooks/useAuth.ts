import { useState, useEffect } from 'react';
import { getAuthInstance } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { registerGuest, GuestProfile } from '@/lib/api-client';

/**
 * Guest session stored in localStorage
 */
interface GuestSession {
  guestId: string;
  firebaseUid: string;
  name: string;
  tableNumber: number;
  attributes?: string[];
  token: string;
  createdAt: number;
}

const SESSION_KEY = 'allstars_guest_session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Auth hook for managing guest authentication and session
 *
 * Handles:
 * - Firebase Anonymous Login
 * - Guest registration with QR token
 * - Session persistence to localStorage (24-hour expiration)
 * - Session restoration on app reload
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load session from localStorage
   */
  const loadSession = (): GuestSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) {
        return null;
      }

      const session: GuestSession = JSON.parse(stored);

      // Check if session is expired (>24 hours)
      const age = Date.now() - session.createdAt;
      if (age > SESSION_EXPIRY_MS) {
        console.warn('Session expired, clearing localStorage');
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
      return null;
    }
  };

  /**
   * Save session to localStorage
   */
  const saveSession = (session: GuestSession): void => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session to localStorage:', error);
    }
  };

  /**
   * Clear session from localStorage
   */
  const clearSession = (): void => {
    localStorage.removeItem(SESSION_KEY);
  };

  /**
   * Initialize Firebase Anonymous Auth
   */
  useEffect(() => {
    // Try to restore session from localStorage
    const existingSession = loadSession();
    if (existingSession) {
      setGuestProfile({
        guestId: existingSession.guestId,
        name: existingSession.name,
        tableNumber: existingSession.tableNumber,
        ...(existingSession.attributes && { attributes: existingSession.attributes }),
      });
    }

    // Set up auth state listener
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        // No user, sign in anonymously
        try {
          const credential = await signInAnonymously(auth);
          setUser(credential.user);
          setLoading(false);
        } catch (err) {
          const error = err as Error;
          console.error('Anonymous sign-in failed:', error);
          setError(error.message);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Register guest with QR code token
   */
  const registerWithToken = async (token: string): Promise<void> => {
    try {
      setError(null);
      setLoading(true);

      // Ensure Firebase auth is ready
      if (!user) {
        throw new Error('Firebase user not initialized');
      }

      // Call registration API
      const profile = await registerGuest(token);

      // Save session
      const session: GuestSession = {
        guestId: profile.guestId,
        firebaseUid: user.uid,
        name: profile.name,
        tableNumber: profile.tableNumber,
        ...(profile.attributes && { attributes: profile.attributes }),
        token,
        createdAt: Date.now(),
      };

      saveSession(session);
      setGuestProfile(profile);
    } catch (err) {
      const error = err as Error;
      console.error('Guest registration failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout and clear session
   */
  const logout = (): void => {
    clearSession();
    setGuestProfile(null);
    setError(null);
  };

  /**
   * Check if user is authenticated (has guest profile)
   */
  const isAuthenticated = !!guestProfile;

  return {
    user,
    guestProfile,
    loading,
    error,
    isAuthenticated,
    registerWithToken,
    logout,
  };
}
