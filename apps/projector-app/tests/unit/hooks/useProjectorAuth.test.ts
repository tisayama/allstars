import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjectorAuth } from '../../../src/hooks/useProjectorAuth';
import type { User } from 'firebase/auth';

// Mock Firebase auth
const mockSignInAnonymously = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockGetAuth = vi.fn();

vi.mock('firebase/auth', () => ({
  signInAnonymously: (...args: unknown[]) => mockSignInAnonymously(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  getAuth: () => mockGetAuth(),
}));

vi.mock('../../../src/lib/firebase', () => ({
  initializeFirebase: vi.fn(),
  getFirebaseAuth: () => mockGetAuth(),
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('useProjectorAuth', () => {
  let mockAuth: any;
  let mockUser: Partial<User>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // Create mock auth instance
    mockAuth = {
      currentUser: null,
    };

    mockGetAuth.mockReturnValue(mockAuth);

    // Create mock user
    mockUser = {
      uid: 'test-anonymous-uid-123',
      isAnonymous: true,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    } as Partial<User>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * T013: Test initial state
   * Verify hook starts with isLoading=true, user=null, isAuthenticated=false
   */
  it('should return initial loading state', () => {
    // Mock onAuthStateChanged to not call callback immediately
    mockOnAuthStateChanged.mockImplementation(() => {
      return vi.fn(); // Return unsubscribe function
    });

    const { result } = renderHook(() => useProjectorAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
  });

  /**
   * T014: Test successful anonymous authentication
   * Mock Firebase signInAnonymously() to return user, verify state updates
   */
  it('should authenticate anonymously when no existing session', async () => {
    // Mock signInAnonymously to return mock user
    mockSignInAnonymously.mockResolvedValue({
      user: mockUser,
    });

    // Mock onAuthStateChanged to immediately call with null (no existing user)
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      // Simulate no existing user
      setTimeout(() => callback(null), 0);
      return vi.fn(); // Unsubscribe function
    });

    const { result } = renderHook(() => useProjectorAuth());

    // Wait for authentication to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockSignInAnonymously).toHaveBeenCalledWith(mockAuth);
    expect(result.current.user).not.toBeNull();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  /**
   * T015: Test session persistence
   * Mock onAuthStateChanged to return existing user, verify no signInAnonymously() call
   */
  it('should restore existing Firebase session without re-authentication', async () => {
    // Mock onAuthStateChanged to immediately call with existing user
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return vi.fn();
    });

    const { result } = renderHook(() => useProjectorAuth());

    // Wait for auth state to update
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should NOT call signInAnonymously when existing user present
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  /**
   * T016: Test expired session handling
   * For projector app, Firebase SDK handles session expiration automatically
   * This test verifies re-authentication happens when onAuthStateChanged returns null
   */
  it('should re-authenticate when Firebase session expires', async () => {
    let authCallback: ((user: User | null) => void) | null = null;

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authCallback = callback;
      // Simulate expired session (Firebase returns null)
      setTimeout(() => callback(null), 0);
      return vi.fn();
    });

    mockSignInAnonymously.mockResolvedValue({
      user: mockUser,
    });

    const { result } = renderHook(() => useProjectorAuth());

    // Wait for re-authentication to complete
    await waitFor(() => {
      expect(mockSignInAnonymously).toHaveBeenCalled();
    });

    // Simulate Firebase calling callback with new user after sign-in
    act(() => {
      authCallback?.(mockUser as User);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  /**
   * T017: Test authentication error handling
   * Mock signInAnonymously() to throw error, verify error state populated
   */
  it('should handle authentication errors gracefully', async () => {
    const mockError = new Error('Network error: Cannot reach Firebase Auth');

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      setTimeout(() => callback(null), 0);
      return vi.fn();
    });

    mockSignInAnonymously.mockRejectedValue(mockError);

    const { result } = renderHook(() => useProjectorAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(mockError.message);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  /**
   * T018: Test automatic token refresh
   * Verify Firebase SDK's onAuthStateChanged listener remains active for token refresh notifications
   */
  it('should maintain auth state listener for token refresh', () => {
    const mockUnsubscribe = vi.fn();

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      // Simulate existing user
      setTimeout(() => callback(mockUser), 0);
      return mockUnsubscribe;
    });

    const { unmount } = renderHook(() => useProjectorAuth());

    // Verify listener is registered
    expect(mockOnAuthStateChanged).toHaveBeenCalledWith(
      mockAuth,
      expect.any(Function)
    );

    // Verify cleanup on unmount
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  /**
   * Additional test: Verify auth state listener updates user when token refreshes
   */
  it('should update user when Firebase token refreshes', async () => {
    let authCallback: ((user: User | null) => void) | null = null;

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authCallback = callback;
      setTimeout(() => callback(mockUser), 0);
      return vi.fn();
    });

    const { result } = renderHook(() => useProjectorAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Simulate token refresh (Firebase calls callback with updated user)
    const refreshedUser = {
      ...mockUser,
      getIdToken: vi.fn().mockResolvedValue('new-refreshed-token'),
    };

    act(() => {
      authCallback?.(refreshedUser as User);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(refreshedUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  /**
   * Edge case: Multiple rapid auth state changes
   */
  it('should handle rapid auth state changes without race conditions', async () => {
    let authCallback: ((user: User | null) => void) | null = null;

    // Mock signInAnonymously for when null is passed
    mockSignInAnonymously.mockResolvedValue({
      user: mockUser,
    });

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      authCallback = callback;
      return vi.fn();
    });

    const { result } = renderHook(() => useProjectorAuth());

    // Rapidly trigger auth state changes
    // Note: In real scenario, Firebase handles this gracefully
    // Only the final state matters for the UI
    act(() => {
      authCallback?.(null);
      authCallback?.(mockUser as User);
      authCallback?.(null);
      authCallback?.(mockUser as User);
    });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
