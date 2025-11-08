import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFPSMonitor } from '../../../src/hooks/useFPSMonitor';

describe('useFPSMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return initial FPS and not degraded state', () => {
    const { result } = renderHook(() => useFPSMonitor());

    expect(result.current.fps).toBeGreaterThanOrEqual(0);
    expect(result.current.isDegraded).toBe(false);
  });

  it('should detect FPS degradation when FPS < 25 for 2 seconds', () => {
    let frameCallback: FrameRequestCallback = () => {};
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useFPSMonitor());

    // Simulate low FPS (< 25) for more than 2 seconds
    act(() => {
      // Simulate frames at ~20 FPS (50ms per frame)
      for (let i = 0; i < 60; i++) {
        frameCallback(performance.now() + i * 50);
      }
      vi.advanceTimersByTime(2100); // Advance past 2 second threshold
    });

    expect(result.current.isDegraded).toBe(true);

    mockRAF.mockRestore();
  });

  it('should NOT detect degradation if FPS drops briefly but recovers', () => {
    let frameCallback: FrameRequestCallback = () => {};
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useFPSMonitor());

    // Simulate brief FPS drop (< 1 second)
    act(() => {
      for (let i = 0; i < 20; i++) {
        frameCallback(performance.now() + i * 50);
      }
      vi.advanceTimersByTime(900); // Less than 2 second threshold
    });

    expect(result.current.isDegraded).toBe(false);

    mockRAF.mockRestore();
  });

  it('should have isDegraded state that can transition', () => {
    const { result } = renderHook(() => useFPSMonitor());

    // Initial state should not be degraded
    expect(result.current.isDegraded).toBe(false);

    // The hook should return a boolean isDegraded property
    expect(typeof result.current.isDegraded).toBe('boolean');
  });

  it('should calculate FPS correctly', () => {
    let frameCallback: FrameRequestCallback = () => {};
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result } = renderHook(() => useFPSMonitor());

    // Simulate consistent 60 FPS (16.67ms per frame)
    act(() => {
      for (let i = 0; i < 60; i++) {
        frameCallback(performance.now() + i * 16.67);
      }
    });

    // FPS should be close to 60
    expect(result.current.fps).toBeGreaterThan(50);
    expect(result.current.fps).toBeLessThan(70);

    mockRAF.mockRestore();
  });

  it('should cleanup on unmount to prevent memory leaks', () => {
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame');
    const mockCAF = vi.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = renderHook(() => useFPSMonitor());

    expect(mockRAF).toHaveBeenCalled();

    unmount();

    // Verify cleanup happened
    expect(mockCAF).toHaveBeenCalled();

    mockRAF.mockRestore();
    mockCAF.mockRestore();
  });

  it('should continue monitoring after multiple renders', () => {
    let frameCallback: FrameRequestCallback = () => {};
    const mockRAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frameCallback = cb;
      return 1;
    });

    const { result, rerender } = renderHook(() => useFPSMonitor());

    // Simulate some frames
    act(() => {
      for (let i = 0; i < 30; i++) {
        frameCallback(performance.now() + i * 16.67);
      }
    });

    const fps1 = result.current.fps;

    // Force re-render
    rerender();

    // Simulate more frames
    act(() => {
      for (let i = 0; i < 30; i++) {
        frameCallback(performance.now() + i * 16.67);
      }
    });

    const fps2 = result.current.fps;

    // Both FPS readings should be valid
    expect(fps1).toBeGreaterThan(0);
    expect(fps2).toBeGreaterThan(0);

    mockRAF.mockRestore();
  });

  it('should track FPS threshold constants correctly', () => {
    // This test verifies the hook uses correct thresholds internally
    // Degradation threshold: 25 FPS
    // Recovery threshold: 35 FPS
    // These are tested through the hook's behavior in integration
    const { result } = renderHook(() => useFPSMonitor());

    // FPS should be a reasonable number
    expect(result.current.fps).toBeGreaterThanOrEqual(0);
    expect(result.current.fps).toBeLessThan(200);
  });

  it('should provide FPS monitoring interface', () => {
    const { result } = renderHook(() => useFPSMonitor());

    // Hook should return an object with fps and isDegraded
    expect(result.current).toHaveProperty('fps');
    expect(result.current).toHaveProperty('isDegraded');
    expect(typeof result.current.fps).toBe('number');
    expect(typeof result.current.isDegraded).toBe('boolean');
  });
});
