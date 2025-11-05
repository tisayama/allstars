import { useState, useRef, useCallback, useEffect } from 'react';

interface PlayOptions {
  loop?: boolean;
}

interface UseAudioPlayerReturn {
  loadAudio: (url: string) => Promise<void>;
  play: (options?: PlayOptions) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for playing audio using Web Audio API
 * Provides methods to load, play, stop audio with volume control
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  /**
   * Load audio file from URL
   */
  const loadAudio = useCallback(
    async (url: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioContext = getAudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        audioBufferRef.current = audioBuffer;

        // Create gain node for volume control
        if (!gainNodeRef.current) {
          gainNodeRef.current = audioContext.createGain();
          gainNodeRef.current.connect(audioContext.destination);
        }

        setIsLoading(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load audio: ${message}`);
        setIsLoading(false);
      }
    },
    [getAudioContext]
  );

  /**
   * Play the loaded audio
   */
  const play = useCallback(
    (options: PlayOptions = {}) => {
      if (!audioBufferRef.current || !gainNodeRef.current) {
        return;
      }

      // Stop any currently playing audio
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch {
          // Ignore errors if already stopped
        }
      }

      const audioContext = getAudioContext();

      // Resume audio context if suspended (required by browser autoplay policies)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create new source node
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.loop = options.loop ?? false;

      // Connect to gain node
      source.connect(gainNodeRef.current);

      // Handle playback end
      source.onended = () => {
        if (!source.loop) {
          setIsPlaying(false);
        }
      };

      source.start(0);
      sourceNodeRef.current = source;
      setIsPlaying(true);
    },
    [getAudioContext]
  );

  /**
   * Stop audio playback
   */
  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  /**
   * Set playback volume (0.0 to 1.0)
   */
  const setVolume = useCallback((volume: number) => {
    if (gainNodeRef.current) {
      // Clamp volume between 0 and 1
      const clampedVolume = Math.max(0, Math.min(1, volume));
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch {
          // Ignore errors
        }
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    loadAudio,
    play,
    stop,
    setVolume,
    isPlaying,
    isLoading,
    error,
  };
}
