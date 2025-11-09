import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useClockSync } from './useClockSync';
import { submitAnswer } from '@/lib/api-client';
import { queueAnswer, processQueue } from '@/utils/answer-queue';
import { calculateResponseTime } from '@/utils/clock-sync';
import { vibrateTap, vibrateSuccess, vibrateFailure } from '@/lib/vibration';

export type GamePhase = 'waiting' | 'answering' | 'reveal' | 'ended';

export interface Question {
  questionId: string;
  questionText: string;
  choices: Array<{ index: number; text: string }>;
  serverStartTime: number;
  period: 'first-half' | 'second-half' | 'overtime';
  questionNumber: number;
}

export interface GameStateData {
  phase: GamePhase;
  currentQuestion: Question | null;
  correctChoice: number | null;
  selectedChoice: number | null;
  answerLocked: boolean;
  submitting: boolean;
  error: string | null;
}

/**
 * Game state hook
 *
 * Manages question state, answer submission, and timing calculations.
 * Listens to WebSocket events and handles answer queue processing.
 */
export function useGameState(guestId: string | null, firebaseUser: any) {
  const { on, isConnected } = useWebSocket(guestId, firebaseUser);
  const { clockOffset, isSynced } = useClockSync();

  const [gameState, setGameState] = useState<GameStateData>({
    phase: 'waiting',
    currentQuestion: null,
    correctChoice: null,
    selectedChoice: null,
    answerLocked: false,
    submitting: false,
    error: null,
  });

  /**
   * Listen to START_QUESTION event
   */
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on('START_QUESTION', (payload: unknown) => {
      console.warn('[GameState] START_QUESTION event received:', payload);

      // Type assertion after validation
      const data = payload as {
        questionId: string;
        questionText: string;
        choices: Array<{ index: number; text: string }>;
        serverStartTime: number;
        period: 'first-half' | 'second-half' | 'overtime';
        questionNumber: number;
      };

      const question: Question = {
        questionId: data.questionId,
        questionText: data.questionText,
        choices: data.choices,
        serverStartTime: data.serverStartTime,
        period: data.period,
        questionNumber: data.questionNumber,
      };

      setGameState((prev) => ({
        ...prev,
        phase: 'answering',
        currentQuestion: question,
        correctChoice: null,
        selectedChoice: null,
        answerLocked: false,
        error: null,
      }));
    });

    return cleanup;
  }, [isConnected, on]);

  /**
   * Listen to GAME_PHASE_CHANGED event
   */
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on('GAME_PHASE_CHANGED', (payload: unknown) => {
      console.warn('GAME_PHASE_CHANGED event received:', payload);

      // Type assertion
      const data = payload as {
        phase: GamePhase;
        correctChoice?: number | null;
      };

      setGameState((prev) => {
        const newState = {
          ...prev,
          phase: data.phase,
          correctChoice: data.correctChoice ?? prev.correctChoice,
        };

        // Trigger haptic feedback on reveal phase
        if (
          data.phase === 'reveal' &&
          data.correctChoice !== undefined &&
          prev.selectedChoice !== null
        ) {
          // Correct answer: 2x100ms vibration
          if (prev.selectedChoice === data.correctChoice) {
            vibrateSuccess();
          } else {
            // Incorrect answer: 300ms vibration
            vibrateFailure();
          }
        }

        return newState;
      });
    });

    return cleanup;
  }, [isConnected, on]);

  /**
   * Submit answer
   */
  const submitAnswerChoice = useCallback(
    async (choiceIndex: number) => {
      if (!guestId || !gameState.currentQuestion || !isSynced || clockOffset === null) {
        console.error('Cannot submit answer: missing required data');
        return;
      }

      // Prevent double submission
      if (gameState.answerLocked || gameState.submitting) {
        console.warn('Answer already submitted or submitting');
        return;
      }

      try {
        // Lock answer immediately
        setGameState((prev) => ({
          ...prev,
          selectedChoice: choiceIndex,
          answerLocked: true,
          submitting: true,
          error: null,
        }));

        // Vibrate on tap
        vibrateTap();

        // Calculate response time with clock offset
        const clientTapTime = Date.now();
        const responseTimeMs = calculateResponseTime(
          gameState.currentQuestion.serverStartTime,
          clientTapTime,
          clockOffset
        );

        // Prepare answer data
        const answerData = {
          guestId,
          questionId: gameState.currentQuestion.questionId,
          choiceIndex,
          responseTimeMs: Math.max(0, responseTimeMs), // Ensure non-negative
        };

        // Try to submit immediately
        try {
          await submitAnswer(answerData);
          console.warn('Answer submitted successfully');
        } catch (err) {
          // Queue for retry if submission fails
          console.warn('Answer submission failed, queuing for retry:', err);
          queueAnswer(answerData);
        }

        setGameState((prev) => ({
          ...prev,
          submitting: false,
        }));
      } catch (err) {
        const error = err as Error;
        console.error('Failed to submit answer:', error);

        setGameState((prev) => ({
          ...prev,
          submitting: false,
          error: error.message,
        }));
      }
    },
    [
      guestId,
      gameState.currentQuestion,
      gameState.answerLocked,
      gameState.submitting,
      isSynced,
      clockOffset,
    ]
  );

  /**
   * Process answer queue periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      processQueue();
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, []);

  return {
    ...gameState,
    submitAnswer: submitAnswerChoice,
    isReady: isSynced && clockOffset !== null,
  };
}
