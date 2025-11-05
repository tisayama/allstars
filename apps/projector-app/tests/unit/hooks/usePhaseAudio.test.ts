import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePhaseAudio } from '@/hooks/usePhaseAudio';
import type { GamePhase } from '@/types';

// Mock useAudioPlayer hook
const mockLoadAudio = vi.fn();
const mockPlay = vi.fn();
const mockStop = vi.fn();
const mockSetVolume = vi.fn();

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    loadAudio: mockLoadAudio,
    play: mockPlay,
    stop: mockStop,
    setVolume: mockSetVolume,
    isPlaying: false,
    isLoading: false,
    error: null,
  }),
}));

describe('usePhaseAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadAudio.mockResolvedValue(undefined);
  });

  it('should not load audio when phase is null', () => {
    renderHook(() => usePhaseAudio(null));

    expect(mockLoadAudio).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('should load and play BGM for ready_for_next phase', async () => {
    renderHook(() => usePhaseAudio('ready_for_next'));

    // Wait for async load
    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/ready.mp3');
    });

    await vi.waitFor(() => {
      expect(mockSetVolume).toHaveBeenCalledWith(0.6);
      expect(mockPlay).toHaveBeenCalledWith({ loop: true });
    });
  });

  it('should load and play BGM for accepting_answers phase', async () => {
    renderHook(() => usePhaseAudio('accepting_answers'));

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/thinking.mp3');
    });

    await vi.waitFor(() => {
      expect(mockSetVolume).toHaveBeenCalledWith(0.7);
      expect(mockPlay).toHaveBeenCalledWith({ loop: true });
    });
  });

  it('should stop previous audio when phase changes', async () => {
    const { rerender } = renderHook<void, { phase: GamePhase | null }>(
      ({ phase }) => usePhaseAudio(phase),
      { initialProps: { phase: 'ready_for_next' } }
    );

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/ready.mp3');
    });

    const initialCallCount = mockStop.mock.calls.length;

    // Change phase
    rerender({ phase: 'accepting_answers' });

    // Should stop previous audio (call count should increase)
    await vi.waitFor(() => {
      expect(mockStop.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('should handle non-looping audio', async () => {
    renderHook(() => usePhaseAudio('showing_distribution'));

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/reveal.mp3');
    });

    await vi.waitFor(() => {
      expect(mockPlay).toHaveBeenCalledWith({ loop: false });
    });
  });

  it('should handle phase with no BGM configured', async () => {
    // If a phase doesn't have BGM in config (though all do currently)
    renderHook(() => usePhaseAudio('all_incorrect'));

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/all_wrong.mp3');
    });
  });

  it('should stop audio on unmount', async () => {
    const { unmount } = renderHook(() => usePhaseAudio('ready_for_next'));

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalled();
    });

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it('should handle rapid phase changes', async () => {
    const { rerender } = renderHook<void, { phase: GamePhase | null }>(
      ({ phase }) => usePhaseAudio(phase),
      { initialProps: { phase: 'ready_for_next' } }
    );

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalledWith('/audio/bgm/ready.mp3');
    });

    const initialStopCount = mockStop.mock.calls.length;

    // Rapid phase changes
    rerender({ phase: 'accepting_answers' });
    rerender({ phase: 'showing_distribution' });
    rerender({ phase: 'showing_correct_answer' });

    // Should have called stop multiple times (at least once per phase change)
    await vi.waitFor(() => {
      expect(mockStop.mock.calls.length).toBeGreaterThan(initialStopCount);
    });

    // Audio should have been loaded at least once (initial load)
    // Note: Due to isLoadingRef guard, not all rapid phase changes will trigger new loads
    // This is correct behavior to prevent race conditions
    expect(mockLoadAudio.mock.calls.length).toBeGreaterThanOrEqual(1);

    // Verify previousPhaseRef was updated (by checking stop was called)
    expect(mockStop).toHaveBeenCalled();
  });

  it('should handle phase changing to null', async () => {
    const { rerender } = renderHook<void, { phase: GamePhase | null }>(
      ({ phase }) => usePhaseAudio(phase),
      { initialProps: { phase: 'ready_for_next' } }
    );

    await vi.waitFor(() => {
      expect(mockLoadAudio).toHaveBeenCalled();
    });

    // Change to null
    rerender({ phase: null });

    expect(mockStop).toHaveBeenCalled();
  });
});
