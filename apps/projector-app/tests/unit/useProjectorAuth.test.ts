/**
 * Unit tests for useProjectorAuth hook
 * Feature: 001-projector-auth [US1]
 *
 * Tests automatic authentication flow with Firebase custom tokens
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectorAuth } from '../../src/hooks/useProjectorAuth';
import * as authService from '../../src/services/authService';
import { signInWithCustomToken, getAuth } from 'firebase/auth';

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signInWithCustomToken: vi.fn(),
}));

// Mock authService
vi.mock('../../src/services/authService');

describe('useProjectorAuth', () => {
  const mockFetchCustomToken = vi.mocked(authService.fetchCustomToken);
  const mockSignInWithCustomToken = vi.mocked(signInWithCustomToken);
  const mockGetAuth = vi.mocked(getAuth);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for getAuth
    mockGetAuth.mockReturnValue({
      currentUser: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Automatic authentication flow', () => {
    it('should automatically fetch custom token on mount', async () => {
      const mockToken = {
        token: 'custom-token-abc123',
        expiresAt: Date.now() + 3600000,
        uid: 'projector-xyz',
      };

      mockFetchCustomToken.mockResolvedValue(mockToken);
      mockSignInWithCustomToken.mockResolvedValue({
        user: { uid: 'projector-xyz' },
      } as any);

      const { result } = renderHook(() => useProjectorAuth());

      // Initially should be authenticating
      expect(result.current.isAuthenticating).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();

      // Wait for authentication to complete
      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.firebaseToken).toBe('custom-token-abc123');
      expect(mockFetchCustomToken).toHaveBeenCalledTimes(1);
      expect(mockSignInWithCustomToken).toHaveBeenCalledWith(
        expect.anything(),
        'custom-token-abc123'
      );
    });

    it('should set error state when token fetch fails', async () => {
      const fetchError = new Error('API server unreachable');
      mockFetchCustomToken.mockRejectedValue(fetchError);

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('API server unreachable');
      expect(result.current.firebaseToken).toBeNull();
    });

    it('should set error state when Firebase sign-in fails', async () => {
      const mockToken = {
        token: 'custom-token-abc123',
        expiresAt: Date.now() + 3600000,
        uid: 'projector-xyz',
      };

      mockFetchCustomToken.mockResolvedValue(mockToken);
      const signInError = new Error('Firebase auth/invalid-custom-token');
      mockSignInWithCustomToken.mockRejectedValue(signInError);

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Firebase auth/invalid-custom-token');
      expect(result.current.firebaseToken).toBe('custom-token-abc123');
    });
  });

  describe('Return values', () => {
    it('should return expected interface structure', () => {
      mockFetchCustomToken.mockResolvedValue({
        token: 'test-token',
        expiresAt: Date.now() + 3600000,
        uid: 'test-uid',
      });

      const { result } = renderHook(() => useProjectorAuth());

      // Check interface structure
      expect(result.current).toHaveProperty('isAuthenticating');
      expect(result.current).toHaveProperty('isAuthenticated');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('firebaseToken');
      expect(result.current).toHaveProperty('tokenExpiresAt');
      expect(result.current).toHaveProperty('uid');

      // Check types
      expect(typeof result.current.isAuthenticating).toBe('boolean');
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
      expect(result.current.firebaseToken === null || typeof result.current.firebaseToken === 'string').toBe(true);
      expect(result.current.tokenExpiresAt === null || typeof result.current.tokenExpiresAt === 'number').toBe(true);
      expect(result.current.uid === null || typeof result.current.uid === 'string').toBe(true);
    });

    it('should expose token expiration time after successful auth', async () => {
      const expiresAt = Date.now() + 3600000;
      const mockToken = {
        token: 'custom-token-abc123',
        expiresAt,
        uid: 'projector-xyz',
      };

      mockFetchCustomToken.mockResolvedValue(mockToken);
      mockSignInWithCustomToken.mockResolvedValue({
        user: { uid: 'projector-xyz' },
      } as any);

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.tokenExpiresAt).toBe(expiresAt);
      expect(result.current.uid).toBe('projector-xyz');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      mockFetchCustomToken.mockRejectedValue(networkError);

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.error).toBe('Network request failed');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle missing environment variables', async () => {
      const configError = new Error('VITE_PROJECTOR_API_KEY is not configured');
      mockFetchCustomToken.mockRejectedValue(configError);

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      expect(result.current.error).toBe('VITE_PROJECTOR_API_KEY is not configured');
    });
  });

  describe('Authentication lifecycle', () => {
    it('should only authenticate once on mount', async () => {
      const mockToken = {
        token: 'custom-token-abc123',
        expiresAt: Date.now() + 3600000,
        uid: 'projector-xyz',
      };

      mockFetchCustomToken.mockResolvedValue(mockToken);
      mockSignInWithCustomToken.mockResolvedValue({
        user: { uid: 'projector-xyz' },
      } as any);

      const { result, rerender } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticating).toBe(false);
      });

      // Rerender the hook
      rerender();

      // Should not call authentication again
      expect(mockFetchCustomToken).toHaveBeenCalledTimes(1);
      expect(mockSignInWithCustomToken).toHaveBeenCalledTimes(1);
    });

    it('should skip authentication if already signed in', async () => {
      // Mock that user is already signed in
      mockGetAuth.mockReturnValue({
        currentUser: { uid: 'projector-already-signed-in' },
      } as any);

      const { result } = renderHook(() => useProjectorAuth());

      // Should immediately be authenticated without calling fetch
      expect(result.current.isAuthenticating).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockFetchCustomToken).not.toHaveBeenCalled();
      expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
    });
  });
});
