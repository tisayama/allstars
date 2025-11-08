import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConnectionStatus } from '../../../src/hooks/useConnectionStatus';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => mockSocket),
  io: vi.fn(() => mockSocket),
}));

describe('useConnectionStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket.connected = true;
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return initial connection status as connected', () => {
    const { result } = renderHook(() => useConnectionStatus(mockSocket as any));

    expect(result.current.isConnected).toBe(true);
    expect(result.current.showIndicator).toBe(false);
  });

  it('should register socket event listeners on mount', () => {
    renderHook(() => useConnectionStatus(mockSocket as any));

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('should cleanup listeners on unmount', () => {
    const { unmount } = renderHook(() => useConnectionStatus(mockSocket as any));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('should show indicator after 2 seconds of disconnect', () => {
    const { result } = renderHook(() => useConnectionStatus(mockSocket as any));

    // Get the disconnect handler
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )?.[1];

    // Trigger disconnect
    act(() => {
      disconnectHandler();
    });

    // Immediately after disconnect, should not show indicator yet
    expect(result.current.isConnected).toBe(false);
    expect(result.current.showIndicator).toBe(false);

    // Advance time by 1 second (not enough)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.showIndicator).toBe(false);

    // Advance time by another 1 second (total 2 seconds)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.showIndicator).toBe(true);
  });

  it('should hide indicator immediately on reconnect', () => {
    const { result } = renderHook(() => useConnectionStatus(mockSocket as any));

    // Get handlers
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )?.[1];
    const connectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'connect'
    )?.[1];

    // Trigger disconnect and wait for indicator
    act(() => {
      disconnectHandler();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.showIndicator).toBe(true);

    // Reconnect
    act(() => {
      connectHandler();
    });

    // Indicator should hide immediately
    expect(result.current.isConnected).toBe(true);
    expect(result.current.showIndicator).toBe(false);
  });

  it('should cancel indicator timer if reconnect happens before 2 seconds', () => {
    const { result } = renderHook(() => useConnectionStatus(mockSocket as any));

    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'disconnect'
    )?.[1];
    const connectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'connect'
    )?.[1];

    // Disconnect
    act(() => {
      disconnectHandler();
    });

    // Wait 1 second (less than 2)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.showIndicator).toBe(false);

    // Reconnect before timer expires
    act(() => {
      connectHandler();
    });

    // Wait for the remaining time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Indicator should never have shown
    expect(result.current.showIndicator).toBe(false);
  });

  it('should use socket.connected property for initial state', () => {
    mockSocket.connected = false;

    const { result } = renderHook(() => useConnectionStatus(mockSocket as any));

    expect(result.current.isConnected).toBe(false);
  });

  it('should handle null socket gracefully', () => {
    const { result } = renderHook(() => useConnectionStatus(null));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.showIndicator).toBe(false);
  });

  it('should handle undefined socket gracefully', () => {
    const { result } = renderHook(() => useConnectionStatus(undefined as any));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.showIndicator).toBe(false);
  });
});
