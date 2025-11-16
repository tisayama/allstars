import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDualChannelUpdates } from '@/hooks/useDualChannelUpdates';
import type { GameState } from '@/types';

// Mock Firestore
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  onSnapshot: (...args: any[]) => mockOnSnapshot(...args),
}));

// Mock Firebase instance
vi.mock('@/lib/firebase', () => ({
  getFirestoreInstance: vi.fn(() => ({})),
}));

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
};

// Mock game state
const mockGameState: GameState = {
  currentPhase: 'ready_for_next',
  currentQuestion: null,
  participantCount: 0,
  results: null,
  isGongActive: false,
  lastUpdate: {
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
  } as any,
};

describe('useDualChannelUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with null game state', () => {
    mockOnSnapshot.mockImplementation(() => vi.fn());

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    expect(result.current.gameState).toBeNull();
    expect(result.current.connectionStatus.firestore).toBe(false);
    expect(result.current.connectionStatus.websocket).toBe(false);
  });

  it('should set up Firestore listener on mount', () => {
    mockOnSnapshot.mockImplementation(() => vi.fn());

    renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    expect(mockDoc).toHaveBeenCalledWith({}, 'gameState', 'live');
    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it('should update game state from Firestore', async () => {
    let firestoreCallback: ((snapshot: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      firestoreCallback = onNext;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    // Simulate Firestore update
    act(() => {
      firestoreCallback?.({
        exists: () => true,
        data: () => mockGameState,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState).toEqual(mockGameState);
    expect(result.current.connectionStatus.firestore).toBe(true);
  });

  it('should handle Firestore listener errors', async () => {
    let errorCallback: ((error: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, _onNext, onError) => {
      errorCallback = onError;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    const testError = new Error('Firestore connection failed');

    act(() => {
      errorCallback?.(testError);
      vi.runAllTimers();
    });

    expect(result.current.error).toBe('Firestore connection failed');
    expect(result.current.connectionStatus.firestore).toBe(false);
  });

  it('should set up WebSocket listeners when authenticated', () => {
    mockOnSnapshot.mockImplementation(() => vi.fn());

    renderHook(() =>
      useDualChannelUpdates({
        socket: mockSocket as any,
        isWebSocketAuthenticated: true,
      })
    );

    expect(mockSocket.on).toHaveBeenCalledWith('GAME_PHASE_CHANGED', expect.any(Function));
  });

  it('should not set up WebSocket listeners when not authenticated', () => {
    mockOnSnapshot.mockImplementation(() => vi.fn());

    renderHook(() =>
      useDualChannelUpdates({
        socket: mockSocket as any,
        isWebSocketAuthenticated: false,
      })
    );

    expect(mockSocket.on).not.toHaveBeenCalled();
  });

  it('should deduplicate rapid updates from same source', async () => {
    let firestoreCallback: ((snapshot: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      firestoreCallback = onNext;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    const state1 = { ...mockGameState, currentPhase: 'ready_for_next' as const };
    const state2 = { ...mockGameState, currentPhase: 'ready_for_next' as const };

    // First update
    act(() => {
      firestoreCallback?.({
        exists: () => true,
        data: () => state1,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState).toEqual(state1);

    // Second update with same phase within 100ms should be deduplicated
    act(() => {
      vi.advanceTimersByTime(50);
      firestoreCallback?.({
        exists: () => true,
        data: () => state2,
      });
      vi.runAllTimers();
    });

    // State should not change
    expect(result.current.gameState).toEqual(state1);
  });

  it('should accept updates when phase changes', async () => {
    let firestoreCallback: ((snapshot: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      firestoreCallback = onNext;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    const state1 = { ...mockGameState, currentPhase: 'ready_for_next' as const };
    const state2 = { ...mockGameState, currentPhase: 'accepting_answers' as const };

    // First update
    act(() => {
      firestoreCallback?.({
        exists: () => true,
        data: () => state1,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState?.currentPhase).toBe('ready_for_next');

    // Second update with different phase should be accepted immediately
    act(() => {
      vi.advanceTimersByTime(10);
      firestoreCallback?.({
        exists: () => true,
        data: () => state2,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState?.currentPhase).toBe('accepting_answers');
  });

  it('should accept updates after 100ms elapsed', async () => {
    let firestoreCallback: ((snapshot: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      firestoreCallback = onNext;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    const state1 = { ...mockGameState, participantCount: 10 };
    const state2 = { ...mockGameState, participantCount: 11 };

    // First update
    act(() => {
      firestoreCallback?.({
        exists: () => true,
        data: () => state1,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState?.participantCount).toBe(10);

    // Second update after 150ms should be accepted
    act(() => {
      vi.advanceTimersByTime(150);
      firestoreCallback?.({
        exists: () => true,
        data: () => state2,
      });
      vi.runAllTimers();
    });

    expect(result.current.gameState?.participantCount).toBe(11);
  });

  it('should handle GAME_PHASE_CHANGED WebSocket event', async () => {
    let phaseChangedCallback: ((payload: { newPhase: string }) => void) | null = null;

    mockOnSnapshot.mockImplementation(() => vi.fn());
    mockSocket.on.mockImplementation((event, callback) => {
      if (event === 'GAME_PHASE_CHANGED') {
        phaseChangedCallback = callback;
      }
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: mockSocket as any,
        isWebSocketAuthenticated: true,
      })
    );

    // Trigger WebSocket event
    act(() => {
      phaseChangedCallback?.({ newPhase: 'accepting_answers' });
      vi.runAllTimers();
    });

    expect(result.current.connectionStatus.websocket).toBe(true);
  });

  it('should clean up Firestore listener on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mockOnSnapshot.mockImplementation(() => mockUnsubscribe);

    const { unmount } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should clean up WebSocket listeners on unmount', () => {
    mockOnSnapshot.mockImplementation(() => vi.fn());

    const { unmount } = renderHook(() =>
      useDualChannelUpdates({
        socket: mockSocket as any,
        isWebSocketAuthenticated: true,
      })
    );

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('GAME_PHASE_CHANGED', expect.any(Function));
  });

  it('should handle non-existent GameState document', async () => {
    let firestoreCallback: ((snapshot: any) => void) | null = null;

    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      firestoreCallback = onNext;
      return vi.fn();
    });

    const { result } = renderHook(() =>
      useDualChannelUpdates({
        socket: null,
        isWebSocketAuthenticated: false,
      })
    );

    act(() => {
      firestoreCallback?.({
        exists: () => false,
      });
      vi.runAllTimers();
    });

    expect(result.current.error).toBe('GameState document does not exist');
    expect(result.current.connectionStatus.firestore).toBe(false);
  });
});
