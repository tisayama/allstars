import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock Firebase auth
vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
  getAuthInstance: vi.fn(() => ({
    currentUser: null,
  })),
}));

// Mock user for tests
const mockUser = {
  uid: 'test-anon-uid',
  isAnonymous: true,
};

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn(() =>
    Promise.resolve({
      user: mockUser,
    })
  ),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Call callback immediately with mock user
    setTimeout(() => callback(mockUser), 0);
    return vi.fn(); // Return unsubscribe function
  }),
}));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  registerGuest: vi.fn(),
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should start with loading state', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.guestProfile).toBeNull();
    });
  });

  describe('Anonymous Login', () => {
    it('should sign in anonymously on mount', async () => {
      const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');

      // Override mock to call callback with null user to trigger anonymous sign-in
      vi.mocked(onAuthStateChanged).mockImplementationOnce((auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockResolvedValueOnce({
        user: { uid: 'test-anon-uid', isAnonymous: true },
      } as any);

      const { useAuth } = await import('@/hooks/useAuth');
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(signInAnonymously).toHaveBeenCalled();
      });
    });

    it('should handle anonymous login failure', async () => {
      const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');

      // Override mock to call callback with null user to trigger anonymous sign-in
      vi.mocked(onAuthStateChanged).mockImplementationOnce((auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockRejectedValueOnce(new Error('Auth failed'));

      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Guest Registration', () => {
    it('should register guest with token', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      const mockProfile = {
        guestId: 'guest-123',
        name: 'Test Guest',
        tableNumber: 5,
        attributes: ['bride-side'],
      };

      vi.mocked(registerGuest).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized (loading = false)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.registerWithToken('qr_token_abc123');

      await waitFor(() => {
        expect(result.current.guestProfile).toEqual(mockProfile);
      });

      expect(registerGuest).toHaveBeenCalledWith('qr_token_abc123');
    });

    it('should handle registration failure', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      vi.mocked(registerGuest).mockRejectedValueOnce(new Error('Token not found'));

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.registerWithToken('invalid_token')).rejects.toThrow(
        'Token not found'
      );
    });
  });

  describe('Session Persistence', () => {
    it('should save session to localStorage after registration', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      const mockProfile = {
        guestId: 'guest-123',
        name: 'Test Guest',
        tableNumber: 5,
      };

      vi.mocked(registerGuest).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.registerWithToken('qr_token_abc123');

      await waitFor(() => {
        const stored = localStorage.getItem('allstars_guest_session');
        expect(stored).toBeDefined();

        const session = JSON.parse(stored!);
        expect(session.guestId).toBe('guest-123');
        expect(session.name).toBe('Test Guest');
        expect(session.token).toBe('qr_token_abc123');
      });
    });

    it('should restore session from localStorage on mount', async () => {
      const existingSession = {
        guestId: 'guest-456',
        firebaseUid: 'firebase-uid-456',
        name: 'Existing Guest',
        tableNumber: 7,
        token: 'existing_token',
        createdAt: Date.now(),
      };

      localStorage.setItem('allstars_guest_session', JSON.stringify(existingSession));

      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.guestProfile).toEqual({
          guestId: 'guest-456',
          name: 'Existing Guest',
          tableNumber: 7,
        });
      });
    });

    it('should not restore expired session (>24 hours)', async () => {
      const expiredSession = {
        guestId: 'guest-789',
        firebaseUid: 'firebase-uid-789',
        name: 'Expired Guest',
        tableNumber: 3,
        token: 'expired_token',
        createdAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      localStorage.setItem('allstars_guest_session', JSON.stringify(expiredSession));

      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.guestProfile).toBeNull();
      });

      // Session should be cleared from localStorage
      expect(localStorage.getItem('allstars_guest_session')).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should clear session and localStorage on logout', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      const mockProfile = {
        guestId: 'guest-123',
        name: 'Test Guest',
        tableNumber: 5,
      };

      vi.mocked(registerGuest).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.registerWithToken('qr_token_abc123');

      await waitFor(() => {
        expect(result.current.guestProfile).toEqual(mockProfile);
      });

      result.current.logout();

      await waitFor(() => {
        expect(result.current.guestProfile).toBeNull();
      });

      expect(localStorage.getItem('allstars_guest_session')).toBeNull();
    });
  });

  describe('Auth State', () => {
    it('should be authenticated when guest profile exists', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      const mockProfile = {
        guestId: 'guest-123',
        name: 'Test Guest',
        tableNumber: 5,
      };

      vi.mocked(registerGuest).mockResolvedValueOnce(mockProfile);

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);

      await result.current.registerWithToken('qr_token_abc123');

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should not be authenticated when no guest profile', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set error state on Firebase auth failure', async () => {
      const { signInAnonymously, onAuthStateChanged } = await import('firebase/auth');

      // Override mock to call callback with null user to trigger anonymous sign-in
      vi.mocked(onAuthStateChanged).mockImplementationOnce((auth, callback) => {
        setTimeout(() => callback(null), 0);
        return vi.fn();
      });

      vi.mocked(signInAnonymously).mockRejectedValueOnce(
        new Error('Firebase auth error')
      );

      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).toBe('Firebase auth error');
      });
    });

    it('should clear error on successful registration', async () => {
      const { registerGuest } = await import('@/lib/api-client');
      const { useAuth } = await import('@/hooks/useAuth');

      const mockProfile = {
        guestId: 'guest-123',
        name: 'Test Guest',
        tableNumber: 5,
      };

      const { result } = renderHook(() => useAuth());

      // Wait for user to be initialized
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Set initial error
      result.current.error = 'Some error';

      vi.mocked(registerGuest).mockResolvedValueOnce(mockProfile);

      await result.current.registerWithToken('qr_token_abc123');

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });
});
