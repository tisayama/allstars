/**
 * useAuth hook for authentication state management
 * Handles login, logout, and token refresh
 */

import { useState, useEffect } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { setupTokenRefresh, isAdmin } from '@/lib/auth';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          const adminStatus = await isAdmin(user);
          setState({
            user,
            isAdmin: adminStatus,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            isAdmin: false,
            loading: false,
            error: null,
          });
        }
      },
      (error) => {
        setState({
          user: null,
          isAdmin: false,
          loading: false,
          error: error as Error,
        });
      }
    );

    // Set up automatic token refresh
    const cleanup = setupTokenRefresh();

    return () => {
      unsubscribe();
      cleanup();
    };
  }, []);

  const signIn = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Auth state will be updated by onAuthStateChanged
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await firebaseSignOut(auth);
      // Auth state will be updated by onAuthStateChanged
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
      throw error;
    }
  };

  return {
    user: state.user,
    isAdmin: state.isAdmin,
    loading: state.loading,
    error: state.error,
    signIn,
    signOut,
  };
}
