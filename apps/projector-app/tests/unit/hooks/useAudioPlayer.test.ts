import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// Mock Web Audio API
const mockAudioContext = {
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  decodeAudioData: vi.fn(),
  state: 'running',
  resume: vi.fn(),
  close: vi.fn(),
};

const mockBufferSource = {
  buffer: null,
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  disconnect: vi.fn(),
  onended: null,
};

const mockGainNode = {
  gain: { value: 1 },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAudioBuffer = {
  duration: 10,
  length: 100000,
  sampleRate: 44100,
};

// Mock global AudioContext
global.AudioContext = vi.fn(() => mockAudioContext as any) as any;

// Mock fetch
global.fetch = vi.fn();

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioContext.createBufferSource.mockReturnValue(mockBufferSource);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioPlayer());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should load audio file successfully', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    expect(global.fetch).toHaveBeenCalledWith('/audio/test.mp3');
    expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle loading error', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/missing.mp3');
    });

    expect(result.current.error).toBe('Failed to load audio: Network error');
    expect(result.current.isLoading).toBe(false);
  });

  it('should play audio after loading', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.play();
    });

    expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    expect(mockBufferSource.connect).toHaveBeenCalled();
    expect(mockBufferSource.start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
  });

  it('should not play if audio not loaded', () => {
    const { result } = renderHook(() => useAudioPlayer());

    act(() => {
      result.current.play();
    });

    expect(mockBufferSource.start).not.toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should stop playing audio', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(mockBufferSource.stop).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });

  it('should set volume correctly', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.setVolume(0.5);
    });

    expect(mockGainNode.gain.value).toBe(0.5);
  });

  it('should clamp volume between 0 and 1', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.setVolume(1.5);
    });

    expect(mockGainNode.gain.value).toBe(1);

    act(() => {
      result.current.setVolume(-0.5);
    });

    expect(mockGainNode.gain.value).toBe(0);
  });

  it('should support looping audio', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/bgm.mp3');
    });

    act(() => {
      result.current.play({ loop: true });
    });

    expect(mockBufferSource.start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
  });

  it('should cleanup on unmount', async () => {
    const { result, unmount } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.play();
    });

    unmount();

    expect(mockBufferSource.stop).toHaveBeenCalled();
  });

  it('should handle play after stop', async () => {
    const { result } = renderHook(() => useAudioPlayer());

    await act(async () => {
      await result.current.loadAudio('/audio/test.mp3');
    });

    act(() => {
      result.current.play();
    });

    act(() => {
      result.current.stop();
    });

    // Should be able to play again
    act(() => {
      result.current.play();
    });

    expect(mockAudioContext.createBufferSource).toHaveBeenCalledTimes(2);
    expect(result.current.isPlaying).toBe(true);
  });
});
