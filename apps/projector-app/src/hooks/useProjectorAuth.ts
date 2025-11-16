import { useState, useEffect } from 'react';
import { initializeFirebase, getFirebaseAuth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import type { ProjectorAuthState } from '@/types';

/**
 * Authentication hook for projector-app
 * Feature: 001-projector-anonymous-auth
 *
 * Handles:
 * - Firebase Anonymous Authentication (automatic on app launch)
 * - Session persistence (Firebase SDK handles via localStorage)
 * - Automatic token refresh (Firebase SDK handles transparently)
 * - Session restoration on app reload
 *
 * Differences from participant-app useAuth:
 * - No guest registration (projector is display-only, not a participant)
 * - No guestProfile state (projector doesn't have user profile)
 * - Pure anonymous authentication without QR token
 * - Read-only access pattern (no write operations)
 *
 * @returns {ProjectorAuthState} Authentication state including user, loading, error
 */
export function useProjectorAuth(): ProjectorAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize Firebase Anonymous Authentication
   *
   * Flow:
   * 1. Set up onAuthStateChanged listener (runs immediately)
   * 2. If existing session: Firebase returns user → setUser → done
   * 3. If no session: Firebase returns null → call signInAnonymously() → setUser → done
   * 4. Listener stays active for automatic token refresh notifications
   */
  useEffect(() => {
    // Ensure Firebase is initialized
    initializeFirebase();
    const auth = getFirebaseAuth();

    // Set up auth state listener (runs immediately with current user or null)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Existing session found (restored from localStorage by Firebase SDK)
        console.log('Projector auth: Existing session restored', {
          uid: firebaseUser.uid,
          isAnonymous: firebaseUser.isAnonymous,
        });

        setUser(firebaseUser);
        setIsLoading(false);
        setError(null);
      } else {
        // No existing session - sign in anonymously
        try {
          console.log('Projector auth: No existing session, signing in anonymously...');
          const credential = await signInAnonymously(auth);

          console.log('Projector auth: Anonymous sign-in successful', {
            uid: credential.user.uid,
          });

          setUser(credential.user);
          setIsLoading(false);
          setError(null);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Anonymous sign-in failed';
          console.error('Projector auth: Anonymous sign-in failed', err);

          setError(message);
          setUser(null);
          setIsLoading(false);
        }
      }
    });

    // Cleanup: Unsubscribe from auth state changes on unmount
    return () => unsubscribe();
  }, []);

  /**
   * Derived state: User is authenticated if Firebase user exists
   * (For projector, this is always anonymous authentication)
   */
  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
  };
}
