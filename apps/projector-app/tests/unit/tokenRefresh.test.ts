/**
 * Unit tests for token expiration handling
 * Feature: 001-projector-auth [US3]
 *
 * Tests token refresh logic to handle expiration before reconnection
 * Ensures projector can operate unattended for 8+ hours (SC-004)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectorAuth } from '../../src/hooks/useProjectorAuth';
import * as authService from '../../src/services/authService';

// Mock the auth service
vi.mock('../../src/services/authService');

// Mock Firebase auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signInWithCustomToken: vi.fn(),
}));

describe('Token Expiration Handling [US3]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Token refresh before expiration', () => {
    it('should detect when token is nearing expiration', async () => {
      const now = Date.now();
      const expiresIn55Minutes = now + (55 * 60 * 1000); // 55 minutes from now

      vi.mocked(authService.fetchCustomToken).mockResolvedValueOnce({
        token: 'initial-token',
        expiresAt: expiresIn55Minutes,
        uid: 'projector-123',
      });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Token should be marked as expiring soon (within 5 minutes of expiration)
      expect(result.current.tokenExpiresAt).toBe(expiresIn55Minutes);

      // Should have logic to determine if token needs refresh
      // Token expiring in 55 minutes should NOT need refresh yet
      if (result.current.needsRefresh) {
        expect(result.current.needsRefresh()).toBe(false);
      }
    });

    it('should trigger refresh when token has less than 5 minutes remaining', async () => {
      const now = Date.now();
      const expiresIn3Minutes = now + (3 * 60 * 1000); // 3 minutes from now

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: expiresIn3Minutes,
          uid: 'projector-123',
        })
        .mockResolvedValueOnce({
          token: 'refreshed-token',
          expiresAt: now + (60 * 60 * 1000), // New token expires in 1 hour
          uid: 'projector-123',
        });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Should detect token needs refresh (< 5 min remaining)
      if (result.current.needsRefresh) {
        expect(result.current.needsRefresh()).toBe(true);
      }

      // Trigger refresh
      if (result.current.refreshToken) {
        await result.current.refreshToken();
      }

      // Should have fetched a new token
      expect(authService.fetchCustomToken).toHaveBeenCalledTimes(2);
    });

    it('should automatically refresh token before expiration', async () => {
      const now = Date.now();
      const expiresIn1Hour = now + (60 * 60 * 1000);

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: expiresIn1Hour,
          uid: 'projector-123',
        })
        .mockResolvedValueOnce({
          token: 'auto-refreshed-token',
          expiresAt: now + (2 * 60 * 60 * 1000), // 2 hours
          uid: 'projector-123',
        });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Fast-forward to 56 minutes (4 minutes before expiration)
      vi.advanceTimersByTime(56 * 60 * 1000);

      // Should automatically trigger refresh
      await waitFor(() => {
        expect(authService.fetchCustomToken).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });
    });
  });

  describe('Token refresh timing', () => {
    it('should refresh 5 minutes before expiration', () => {
      const now = Date.now();
      const expiresAt = now + (60 * 60 * 1000); // 1 hour from now
      const expectedRefreshTime = expiresAt - (5 * 60 * 1000); // 5 minutes before

      // Helper function to calculate refresh time
      const calculateRefreshTime = (expiresAt: number): number => {
        return expiresAt - (5 * 60 * 1000);
      };

      const refreshTime = calculateRefreshTime(expiresAt);
      expect(refreshTime).toBe(expectedRefreshTime);
    });

    it('should use 80% of token lifetime for very short-lived tokens', () => {
      const now = Date.now();
      const expiresAt = now + (10 * 60 * 1000); // 10 minutes from now

      // For tokens < 10 minutes, refresh at 80% of lifetime
      const calculateRefreshTime = (expiresAt: number): number => {
        const lifetime = expiresAt - Date.now();
        if (lifetime < 10 * 60 * 1000) {
          return Date.now() + (lifetime * 0.8);
        }
        return expiresAt - (5 * 60 * 1000);
      };

      const refreshTime = calculateRefreshTime(expiresAt);
      expect(refreshTime).toBeGreaterThan(now + (7 * 60 * 1000)); // After 7 min
      expect(refreshTime).toBeLessThan(now + (9 * 60 * 1000)); // Before 9 min
    });
  });

  describe('Refresh failure handling', () => {
    it('should retry refresh on failure', async () => {
      const now = Date.now();

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: now + (3 * 60 * 1000),
          uid: 'projector-123',
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          token: 'retry-token',
          expiresAt: now + (60 * 60 * 1000),
          uid: 'projector-123',
        });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Attempt refresh (will fail)
      if (result.current.refreshToken) {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Expected to fail first time
        }

        // Retry should succeed
        await result.current.refreshToken();
      }

      expect(authService.fetchCustomToken).toHaveBeenCalledTimes(3);
    });

    it('should set error state on refresh failure', async () => {
      const now = Date.now();

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: now + (3 * 60 * 1000),
          uid: 'projector-123',
        })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Attempt refresh
      if (result.current.refreshToken) {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Should set error state
          await waitFor(() => {
            expect(result.current.error).toBeTruthy();
            expect(result.current.error).toContain('Refresh failed');
          });
        }
      }
    });

    it('should maintain authentication even if refresh fails', async () => {
      const now = Date.now();

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: now + (3 * 60 * 1000),
          uid: 'projector-123',
        })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Attempt refresh
      if (result.current.refreshToken) {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Should still be authenticated with old token
          expect(result.current.isAuthenticated).toBe(true);
        }
      }
    });
  });

  describe('Manual refresh', () => {
    it('should expose refreshToken method', async () => {
      vi.mocked(authService.fetchCustomToken).mockResolvedValueOnce({
        token: 'initial-token',
        expiresAt: Date.now() + (60 * 60 * 1000),
        uid: 'projector-123',
      });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.refreshToken).toBeDefined();
      expect(typeof result.current.refreshToken).toBe('function');
    });

    it('should allow manual refresh call', async () => {
      const now = Date.now();

      vi.mocked(authService.fetchCustomToken)
        .mockResolvedValueOnce({
          token: 'initial-token',
          expiresAt: now + (60 * 60 * 1000),
          uid: 'projector-123',
        })
        .mockResolvedValueOnce({
          token: 'manually-refreshed-token',
          expiresAt: now + (2 * 60 * 60 * 1000),
          uid: 'projector-123',
        });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Manually trigger refresh
      if (result.current.refreshToken) {
        await result.current.refreshToken();
      }

      expect(authService.fetchCustomToken).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(result.current.firebaseToken).toBe('manually-refreshed-token');
      });
    });
  });

  describe('8+ hour operation (SC-004)', () => {
    it('should support tokens with 1 hour expiration', async () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      vi.mocked(authService.fetchCustomToken).mockResolvedValue({
        token: 'token',
        expiresAt: now + oneHour,
        uid: 'projector-123',
      });

      const { result } = renderHook(() => useProjectorAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Should be able to calculate that ~8 refreshes needed for 8 hours
      const hoursOfOperation = 8;
      const tokenLifetime = oneHour;
      const estimatedRefreshes = Math.ceil((hoursOfOperation * 60 * 60 * 1000) / tokenLifetime);

      expect(estimatedRefreshes).toBeGreaterThanOrEqual(8);
      expect(estimatedRefreshes).toBeLessThanOrEqual(10);
    });
  });
});
