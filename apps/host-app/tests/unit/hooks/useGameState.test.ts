/**
 * Unit tests for useGameState hook
 * Tests Firestore real-time listener, connection handling, and state updates
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';
import * as firestore from 'firebase/firestore';
import type { GameState } from '@allstars/types';

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(),
}));

// Mock Firebase config
vi.mock('@/lib/firebase', () => ({
  firestore: {},
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    firestore: {
      connectionFailure: vi.fn(),
      reconnected: vi.fn(),
      listenerError: vi.fn(),
    },
    gameState: {
      phaseChange: vi.fn(),
    },
  },
}));

describe('useGameState', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMock = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return null gameState when not loaded', () => {
      vi.mocked(firestore.onSnapshot).mockImplementation(() => {
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      expect(result.current.gameState).toBeNull();
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should set up Firestore listener on mount', () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.onSnapshot).mockImplementation(() => {
        return unsubscribeMock;
      });

      renderHook(() => useGameState('session-123'));

      expect(firestore.doc).toHaveBeenCalled();
      expect(firestore.onSnapshot).toHaveBeenCalled();
    });

    it('should clean up listener on unmount', () => {
      vi.mocked(firestore.onSnapshot).mockImplementation(() => {
        return unsubscribeMock;
      });

      const { unmount } = renderHook(() => useGameState('session-123'));

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('successful state updates', () => {
    it('should update gameState when Firestore document changes', async () => {
      const mockGameState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now() },
      };

      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, callback: any) => {
        // Simulate successful snapshot
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => mockGameState,
          });
        }, 10);
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      await waitFor(() => {
        expect(result.current.gameState).not.toBeNull();
      });

      expect(result.current.gameState?.currentPhase).toBe('ready_for_next');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should detect phase changes and log them', async () => {
      const initialState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now() },
      };

      const updatedState: GameState = {
        ...initialState,
        currentPhase: 'accepting_answers',
      };

      let callbackFn: any;

      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, callback: any) => {
        callbackFn = callback;
        // Send initial state
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => initialState,
          });
        }, 10);
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      await waitFor(() => {
        expect(result.current.gameState?.currentPhase).toBe('ready_for_next');
      });

      // Simulate phase change
      act(() => {
        callbackFn({
          exists: () => true,
          data: () => updatedState,
        });
      });

      await waitFor(() => {
        expect(result.current.gameState?.currentPhase).toBe('accepting_answers');
      });
    });

    it('should handle participant count updates', async () => {
      const mockGameState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        participantCount: 15,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now() },
      };

      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, callback: any) => {
        setTimeout(() => {
          callback({
            exists: () => true,
            data: () => mockGameState,
          });
        }, 10);
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      await waitFor(() => {
        expect(result.current.gameState?.participantCount).toBe(15);
      });
    });
  });

  describe('error handling', () => {
    it('should handle Firestore listener errors', async () => {
      const mockError = new Error('Firestore connection failed');

      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, onSuccess: any, onError: any) => {
        // Call error callback immediately to avoid timing issues
        Promise.resolve().then(() => {
          if (onError) {
            onError(mockError);
          }
        });
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(result.current.error?.message).toBe('Firestore connection failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle non-existent session documents', async () => {
      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, callback: any, onError: any) => {
        Promise.resolve().then(() => {
          callback({
            exists: () => false,
            data: () => null,
          });
        });
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('non-existent-session'));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(result.current.error?.message).toContain('not found');
      expect(result.current.gameState).toBeNull();
    });

    it('should handle malformed data', async () => {
      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, callback: any, onError: any) => {
        Promise.resolve().then(() => {
          callback({
            exists: () => true,
            data: () => ({ invalid: 'data' }), // Missing required fields
          });
        });
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      await waitFor(
        () => {
          expect(result.current.error).not.toBeNull();
        },
        { timeout: 3000 }
      );

      expect(result.current.error?.message).toContain('Invalid game state data');
    });
  });

  describe('reconnection handling', () => {
    it('should handle reconnection after error', async () => {
      const mockError = new Error('Network error');
      const mockGameState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date(), toMillis: () => Date.now() },
      };

      let callbackFn: any;
      let errorCallbackFn: any;

      vi.mocked(firestore.onSnapshot).mockImplementation((docRef, onSuccess: any, onError: any) => {
        callbackFn = onSuccess;
        errorCallbackFn = onError;

        // Simulate initial error
        setTimeout(() => {
          errorCallbackFn(mockError);
        }, 10);

        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState('session-123'));

      // Wait for error
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Simulate reconnection
      act(() => {
        callbackFn({
          exists: () => true,
          data: () => mockGameState,
        });
      });

      await waitFor(() => {
        expect(result.current.gameState).not.toBeNull();
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('session changes', () => {
    it('should update listener when sessionId changes', async () => {
      vi.mocked(firestore.onSnapshot).mockImplementation(() => {
        return unsubscribeMock;
      });

      const { rerender } = renderHook(
        ({ sessionId }) => useGameState(sessionId),
        { initialProps: { sessionId: 'session-123' } }
      );

      expect(firestore.onSnapshot).toHaveBeenCalledTimes(1);

      // Change sessionId
      rerender({ sessionId: 'session-456' });

      expect(unsubscribeMock).toHaveBeenCalled(); // Previous listener cleaned up
      expect(firestore.onSnapshot).toHaveBeenCalledTimes(2); // New listener created
    });

    it('should not set up listener with empty sessionId', () => {
      vi.mocked(firestore.onSnapshot).mockImplementation(() => {
        return unsubscribeMock;
      });

      const { result } = renderHook(() => useGameState(''));

      expect(firestore.onSnapshot).not.toHaveBeenCalled();
      expect(result.current.gameState).toBeNull();
      expect(result.current.error?.message).toContain('Session ID required');
    });
  });
});
