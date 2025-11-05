import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  io: {
    opts: {
      autoConnect: false,
    },
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket as any),
}));

// Mock Firebase auth
const mockGetIdToken = vi.fn();
vi.mock('@/lib/firebase', () => ({
  getFirebaseAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: mockGetIdToken,
    },
  })),
}));

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockGetIdToken.mockResolvedValue('mock-firebase-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => useWebSocket());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should connect to socket server on mount', () => {
    renderHook(() => useWebSocket());

    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should set up event listeners on mount', () => {
    renderHook(() => useWebSocket());

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('AUTH_REQUIRED', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('AUTH_SUCCESS', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('AUTH_FAILED', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('GONG_ACTIVATED', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('START_QUESTION', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('GAME_PHASE_CHANGED', expect.any(Function));
  });

  it('should handle connection event', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Get the connect callback
    const connectCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'connect'
    )?.[1];

    expect(connectCallback).toBeDefined();

    act(() => {
      mockSocket.connected = true;
      connectCallback?.();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle AUTH_REQUIRED and send authentication', async () => {
    renderHook(() => useWebSocket());

    // Get the AUTH_REQUIRED callback
    const authRequiredCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_REQUIRED'
    )?.[1];

    expect(authRequiredCallback).toBeDefined();

    await act(async () => {
      authRequiredCallback?.({ timeout: 10000 });
    });

    await waitFor(() => {
      expect(mockGetIdToken).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', {
        token: 'mock-firebase-token',
      });
    });
  });

  it('should handle AUTH_SUCCESS event', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Get the AUTH_SUCCESS callback
    const authSuccessCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_SUCCESS'
    )?.[1];

    expect(authSuccessCallback).toBeDefined();

    act(() => {
      authSuccessCallback?.({ userId: 'test-user-id' });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should handle AUTH_FAILED event', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Get the AUTH_FAILED callback
    const authFailedCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_FAILED'
    )?.[1];

    expect(authFailedCallback).toBeDefined();

    act(() => {
      authFailedCallback?.({ reason: 'Invalid token' });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Authentication failed: Invalid token');
    });
  });

  it('should handle disconnect event', async () => {
    const { result } = renderHook(() => useWebSocket());

    // First connect
    const connectCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'connect'
    )?.[1];

    act(() => {
      mockSocket.connected = true;
      connectCallback?.();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Then disconnect
    const disconnectCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )?.[1];

    act(() => {
      mockSocket.connected = false;
      disconnectCallback?.('transport close');
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('should handle GONG_ACTIVATED event', async () => {
    const onGongActivated = vi.fn();
    renderHook(() => useWebSocket({ onGongActivated }));

    // Get the GONG_ACTIVATED callback
    const gongCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'GONG_ACTIVATED'
    )?.[1];

    expect(gongCallback).toBeDefined();

    act(() => {
      gongCallback?.({});
    });

    await waitFor(() => {
      expect(onGongActivated).toHaveBeenCalled();
    });
  });

  it('should handle START_QUESTION event', async () => {
    const onStartQuestion = vi.fn();
    renderHook(() => useWebSocket({ onStartQuestion }));

    // Get the START_QUESTION callback
    const startQuestionCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'START_QUESTION'
    )?.[1];

    expect(startQuestionCallback).toBeDefined();

    const payload = {
      questionId: 'q001',
      serverStartTime: Date.now(),
    };

    act(() => {
      startQuestionCallback?.(payload);
    });

    await waitFor(() => {
      expect(onStartQuestion).toHaveBeenCalledWith(payload);
    });
  });

  it('should handle GAME_PHASE_CHANGED event', async () => {
    const onGamePhaseChanged = vi.fn();
    renderHook(() => useWebSocket({ onGamePhaseChanged }));

    // Get the GAME_PHASE_CHANGED callback
    const phaseChangedCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'GAME_PHASE_CHANGED'
    )?.[1];

    expect(phaseChangedCallback).toBeDefined();

    const payload = {
      newPhase: 'showing_distribution' as const,
    };

    act(() => {
      phaseChangedCallback?.(payload);
    });

    await waitFor(() => {
      expect(onGamePhaseChanged).toHaveBeenCalledWith(payload);
    });
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSocket.off).toHaveBeenCalled();
  });

  it('should handle authentication failure when Firebase token is unavailable', async () => {
    mockGetIdToken.mockResolvedValue(null);

    const { result } = renderHook(() => useWebSocket());

    // Get the AUTH_REQUIRED callback
    const authRequiredCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_REQUIRED'
    )?.[1];

    await act(async () => {
      authRequiredCallback?.({ timeout: 10000 });
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Failed to get Firebase ID token');
    });
  });

  it('should retry authentication on failure', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Fail authentication
    const authFailedCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_FAILED'
    )?.[1];

    act(() => {
      authFailedCallback?.({ reason: 'Token expired' });
    });

    await waitFor(() => {
      expect(result.current.error).toContain('Token expired');
    });

    // Then succeed on retry
    const authSuccessCallback = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'AUTH_SUCCESS'
    )?.[1];

    act(() => {
      authSuccessCallback?.({ userId: 'test-user-id' });
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});
