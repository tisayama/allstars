import type { GamePhase } from '@/types';

/**
 * Audio configuration mapping game phases to audio files
 */
export interface PhaseAudioConfig {
  bgm?: string; // Background music file path
  sfx?: string[]; // Sound effects for this phase
  volume?: number; // Volume level (0.0 to 1.0)
  loop?: boolean; // Whether to loop the BGM
}

/**
 * Audio file paths for each game phase
 *
 * Note: Audio files should be placed in the public/audio directory
 * Paths are relative to the public directory
 */
export const PHASE_AUDIO_CONFIG: Record<GamePhase, PhaseAudioConfig> = {
  ready_for_next: {
    bgm: '/audio/bgm/ready.mp3',
    volume: 0.6,
    loop: true,
  },
  accepting_answers: {
    bgm: '/audio/bgm/thinking.mp3',
    sfx: ['/audio/sfx/question_start.mp3'],
    volume: 0.7,
    loop: true,
  },
  showing_distribution: {
    bgm: '/audio/bgm/reveal.mp3',
    sfx: ['/audio/sfx/reveal.mp3'],
    volume: 0.6,
    loop: false,
  },
  showing_correct_answer: {
    bgm: '/audio/bgm/correct.mp3',
    sfx: ['/audio/sfx/correct_answer.mp3'],
    volume: 0.7,
    loop: false,
  },
  showing_results: {
    bgm: '/audio/bgm/results.mp3',
    sfx: ['/audio/sfx/drumroll.mp3'],
    volume: 0.6,
    loop: true,
  },
  all_incorrect: {
    bgm: '/audio/bgm/all_wrong.mp3',
    sfx: ['/audio/sfx/sad_trombone.mp3'],
    volume: 0.6,
    loop: false,
  },
  all_revived: {
    bgm: '/audio/bgm/celebration.mp3',
    sfx: ['/audio/sfx/cheer.mp3'],
    volume: 0.7,
    loop: false,
  },
};

/**
 * Special event sound effects (triggered independently of phase)
 */
export const EVENT_AUDIO = {
  gong: '/audio/sfx/gong.mp3',
  timer_warning: '/audio/sfx/timer_warning.mp3',
  countdown: '/audio/sfx/countdown.mp3',
};

/**
 * Default audio settings
 */
export const DEFAULT_AUDIO_CONFIG = {
  volume: 0.6,
  loop: false,
};
