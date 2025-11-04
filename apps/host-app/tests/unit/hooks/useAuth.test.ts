/**
 * Unit tests for useAuth hook
 * Tests authentication flow, session persistence, and token refresh
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as firebaseAuth from 'firebase/auth';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

// Mock Firebase config
vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    auth: {
      loginSuccess: vi.fn(),
      loginFailure: vi.fn(),
      logoutSuccess: vi.fn(),
      logoutFailure: vi.fn(),
      sessionExpired: vi.fn(),
      tokenRefreshed: vi.fn(),
      tokenRefreshFailure: vi.fn(),
    },
    error: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should return null user when not authenticated', () => {
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should restore session from localStorage on mount', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const mockToken = 'mock-id-token';
      const mockExpiry = Date.now() + 3600000; // 1 hour from now

      localStorage.setItem(
        'host-auth',
        JSON.stringify({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          idToken: mockToken,
          tokenExpiresAt: mockExpiry,
        })
      );

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          getIdToken: vi.fn().mockResolvedValue(mockToken),
          getIdTokenResult: vi.fn().mockResolvedValue({
            expirationTime: new Date(mockExpiry).toISOString(),
          }),
        } as any);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      expect(result.current.user?.email).toBe(mockUser.email);
    });
  });

  describe('login', () => {
    it('should successfully login with Google', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('mock-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      };

      vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue({
        user: mockUser,
      } as any);

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
      expect(result.current.user?.email).toBe(mockUser.email);
    });

    it('should handle login errors', async () => {
      const error = new Error('Login failed');
      vi.mocked(firebaseAuth.signInWithPopup).mockRejectedValue(error);

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login()).rejects.toThrow('Login failed');
      });

      expect(result.current.user).toBeNull();
    });

    it('should persist session to localStorage after successful login', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('mock-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      };

      vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValue({
        user: mockUser,
      } as any);

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login();
      });

      const stored = localStorage.getItem('host-auth');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.email).toBe(mockUser.email);
      expect(parsed.idToken).toBe('mock-token');
    });
  });

  describe('logout', () => {
    it('should clear user state and localStorage on logout', async () => {
      localStorage.setItem('host-auth', JSON.stringify({ email: 'test@example.com' }));

      vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(firebaseAuth.signOut).toHaveBeenCalled();
      expect(localStorage.getItem('host-auth')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('token refresh', () => {
    it('should refresh token when approaching expiry', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('new-token'),
        getIdTokenResult: vi.fn().mockResolvedValue({
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
        }),
      };

      // Set token to expire in 4 minutes (should trigger refresh at 5 min threshold)
      const expiringToken = Date.now() + 240000;

      localStorage.setItem(
        'host-auth',
        JSON.stringify({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          idToken: 'old-token',
          tokenExpiresAt: expiringToken,
        })
      );

      vi.mocked(firebaseAuth.onAuthStateChanged).mockImplementation((auth, callback) => {
        callback(mockUser as any);
        return () => {};
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Token should be refreshed
      await waitFor(() => {
        const stored = localStorage.getItem('host-auth');
        const parsed = JSON.parse(stored!);
        expect(parsed.idToken).toBe('new-token');
      });
    });
  });
});
