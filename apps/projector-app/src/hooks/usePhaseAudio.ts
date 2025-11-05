import { useEffect, useRef } from 'react';
import { useAudioPlayer } from './useAudioPlayer';
import { PHASE_AUDIO_CONFIG, DEFAULT_AUDIO_CONFIG } from '@/config/audio';
import type { GamePhase } from '@/types';

/**
 * Hook to automatically manage audio playback based on current game phase
 * Loads and plays BGM when phase changes, with proper cleanup
 *
 * @param currentPhase - The current game phase, or null if no phase is active
 */
export function usePhaseAudio(currentPhase: GamePhase | null): void {
  const audioPlayer = useAudioPlayer();
  const previousPhaseRef = useRef<GamePhase | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // If phase hasn't changed, do nothing
    if (currentPhase === previousPhaseRef.current) {
      return;
    }

    // Stop any currently playing audio when phase changes
    if (previousPhaseRef.current !== null) {
      audioPlayer.stop();
    }

    // Update previous phase reference
    previousPhaseRef.current = currentPhase;

    // If no phase or no audio configured for this phase, return
    if (!currentPhase) {
      return;
    }

    const phaseConfig = PHASE_AUDIO_CONFIG[currentPhase];
    if (!phaseConfig?.bgm) {
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    // Load and play the BGM for this phase
    const loadAndPlay = async () => {
      isLoadingRef.current = true;

      try {
        await audioPlayer.loadAudio(phaseConfig.bgm!);

        // Set volume (use phase config or default)
        const volume = phaseConfig.volume ?? DEFAULT_AUDIO_CONFIG.volume;
        audioPlayer.setVolume(volume);

        // Play with loop setting
        const loop = phaseConfig.loop ?? DEFAULT_AUDIO_CONFIG.loop;
        audioPlayer.play({ loop });
      } catch (error) {
        console.error(`Failed to load audio for phase ${currentPhase}:`, error);
      } finally {
        isLoadingRef.current = false;
      }
    };

    loadAndPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]); // Only depend on currentPhase, not audioPlayer

  // Cleanup: stop audio on unmount
  useEffect(() => {
    return () => {
      audioPlayer.stop();
    };
  }, [audioPlayer]);
}
