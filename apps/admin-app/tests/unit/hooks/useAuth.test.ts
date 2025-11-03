/**
 * Unit tests for useAuth hook (T035)
 * Tests login, logout, and token refresh functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as authLib from '@/lib/auth';

// Mock Firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Immediately call callback with null user for test setup
    callback(null);
    // Return unsubscribe function
    return vi.fn();
  }),
}));

vi.mock('@/lib/auth', () => ({
  setupTokenRefresh: vi.fn(() => vi.fn()),
  isAdmin: vi.fn(() => Promise.resolve(false)),
  getIdToken: vi.fn(() => Promise.resolve(null)),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false); // Will be false after initial callback
  });

  it('should provide signIn and signOut functions', () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should handle sign-in errors', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const mockError = new Error('Sign-in failed');
    vi.mocked(signInWithPopup).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuth());

    await expect(result.current.signIn()).rejects.toThrow('Sign-in failed');
  });

  it('should set up token refresh on mount', () => {
    renderHook(() => useAuth());

    expect(vi.mocked(authLib.setupTokenRefresh)).toHaveBeenCalled();
  });
});
