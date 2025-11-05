import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';
import type { GameState } from '@/types';

// Mock Firestore
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn();
const mockGetFirestoreInstance = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock('@/lib/firebase', () => ({
  getFirestoreInstance: () => mockGetFirestoreInstance(),
}));

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFirestoreInstance.mockReturnValue({});
    mockDoc.mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null gameState and disconnected status', () => {
    mockOnSnapshot.mockImplementation(() => () => {});

    const { result } = renderHook(() => useGameState());

    expect(result.current.gameState).toBeNull();
    expect(result.current.connectionStatus.firestore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set connection status to true when snapshot is received', async () => {
    const mockGameState: GameState = {
      id: 'live',
      currentPhase: 'ready_for_next',
      currentQuestion: null,
      isGongActive: false,
      results: null,
      prizeCarryover: 0,
      lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
    };

    mockOnSnapshot.mockImplementation((_docRef, callback, _onError) => {
      // Simulate snapshot callback
      setTimeout(() => {
        callback({
          exists: () => true,
          data: () => mockGameState,
        });
      }, 0);
      return () => {}; // Unsubscribe function
    });

    const { result } = renderHook(() => useGameState());

    await waitFor(() => {
      expect(result.current.gameState).toEqual(mockGameState);
      expect(result.current.connectionStatus.firestore).toBe(true);
    });
  });

  it('should update gameState when document changes', async () => {
    const initialState: GameState = {
      id: 'live',
      currentPhase: 'ready_for_next',
      currentQuestion: null,
      isGongActive: false,
      results: null,
      prizeCarryover: 0,
      lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
    };

    const updatedState: GameState = {
      ...initialState,
      currentPhase: 'accepting_answers',
      currentQuestion: {
        questionId: 'q1',
        questionText: 'What is 2 + 2?',
        choices: [
          { index: 0, text: '2' },
          { index: 1, text: '3' },
          { index: 2, text: '4' },
          { index: 3, text: '5' },
        ],
        correctAnswer: '4',
        period: 'first-half',
        questionNumber: 1,
        deadline: { seconds: 1699114200, nanoseconds: 0 } as any,
        type: 'multiple-choice',
        skipAttributes: [],
      },
    };

    let snapshotCallback!: (snapshot: any) => void;

    mockOnSnapshot.mockImplementation((_docRef, callback, _onError) => {
      snapshotCallback = callback;
      // Send initial state
      setTimeout(() => {
        callback({
          exists: () => true,
          data: () => initialState,
        });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useGameState());

    // Wait for initial state
    await waitFor(() => {
      expect(result.current.gameState).toEqual(initialState);
    });

    // Simulate state update
    snapshotCallback({
      exists: () => true,
      data: () => updatedState,
    });

    await waitFor(() => {
      expect(result.current.gameState).toEqual(updatedState);
    });
  });

  it('should handle snapshot errors', async () => {
    const mockError = new Error('Firestore connection failed');

    mockOnSnapshot.mockImplementation((_docRef, _onNext, onError) => {
      setTimeout(() => {
        onError(mockError);
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useGameState());

    await waitFor(() => {
      expect(result.current.error).toBe(mockError.message);
      expect(result.current.connectionStatus.firestore).toBe(false);
    });
  });

  it('should handle non-existent document', async () => {
    mockOnSnapshot.mockImplementation((_docRef, callback, _onError) => {
      setTimeout(() => {
        callback({
          exists: () => false,
          data: () => undefined,
        });
      }, 0);
      return () => {};
    });

    const { result } = renderHook(() => useGameState());

    await waitFor(() => {
      expect(result.current.error).toBe('GameState document does not exist');
      expect(result.current.connectionStatus.firestore).toBe(false);
    });
  });

  it('should cleanup listener on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useGameState());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
