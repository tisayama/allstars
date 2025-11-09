import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useClockSync } from './useClockSync';
import { submitAnswer } from '@/lib/api-client';
import { queueAnswer, processQueue } from '@/utils/answer-queue';
import { calculateResponseTime } from '@/utils/clock-sync';
import { vibrateTap, vibrateSuccess } from '@/lib/vibration';
import { fetchQuestion } from '@/lib/firestore';
import type { Question } from '@allstars/types';
import type { StartQuestionPayload, GamePhaseChangedPayload } from '@allstars/types';
import type { GamePhase as CanonicalGamePhase } from '@allstars/types';

// Participant-app simplified game phases (mapped from canonical GamePhase)
export type GamePhase = 'waiting' | 'answering' | 'reveal' | 'ended';

// Extended Question with serverStartTime (from Socket.io event)
export interface QuestionWithTiming extends Question {
  serverStartTime: number;
}

export interface GameStateData {
  phase: GamePhase;
  currentQuestion: QuestionWithTiming | null;
  correctChoice: number | null;
  selectedChoice: number | null;
  answerLocked: boolean;
  submitting: boolean;
  error: string | null;
  isGongActive: boolean; // Track gong state for UI
}

/**
 * Map canonical GamePhase to participant-app simplified phases
 */
function mapToParticipantPhase(canonicalPhase: CanonicalGamePhase): GamePhase {
  switch (canonicalPhase) {
    case 'accepting_answers':
      return 'answering';
    case 'showing_distribution':
    case 'showing_correct_answer':
    case 'showing_results':
      return 'reveal';
    case 'ready_for_next':
    case 'all_incorrect':
    case 'all_revived':
    default:
      return 'waiting';
  }
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
    isGongActive: false,
  });

  /**
   * Listen to START_QUESTION event
   * Receives questionId and serverStartTime, then fetches full question from Firestore
   */
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on('START_QUESTION', async (payload: unknown) => {
      console.warn('[GameState] START_QUESTION event received:', payload);

      const data = payload as StartQuestionPayload;

      // Fetch full question details from Firestore
      const questionData = await fetchQuestion(data.questionId);

      if (!questionData) {
        console.error(`Failed to fetch question ${data.questionId}`);
        setGameState((prev) => ({
          ...prev,
          error: `Failed to load question ${data.questionId}`,
        }));
        return;
      }

      // Combine Firestore question data with Socket.io timing data
      const questionWithTiming: QuestionWithTiming = {
        ...questionData,
        serverStartTime: data.serverStartTime,
      };

      setGameState((prev) => ({
        ...prev,
        phase: 'answering',
        currentQuestion: questionWithTiming,
        correctChoice: null,
        selectedChoice: null,
        answerLocked: false,
        error: null,
        isGongActive: prev.isGongActive, // Preserve gong state
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

      const data = payload as GamePhaseChangedPayload;
      const mappedPhase = mapToParticipantPhase(data.newPhase);

      setGameState((prev) => {
        const newState = {
          ...prev,
          phase: mappedPhase,
        };

        // Trigger haptic feedback on reveal phase
        if (mappedPhase === 'reveal' && prev.selectedChoice !== null) {
          // Note: correctChoice is determined by the question data, not the phase change event
          // Vibration will be triggered when we know if the answer was correct
          // For now, we'll add vibration when the correct answer is revealed
        }

        return newState;
      });
    });

    return cleanup;
  }, [isConnected, on]);

  /**
   * Listen to GONG_ACTIVATED event
   */
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on('GONG_ACTIVATED', (payload: unknown) => {
      console.warn('[GameState] GONG_ACTIVATED event received:', payload);

      setGameState((prev) => ({
        ...prev,
        isGongActive: true,
      }));

      // Trigger vibration for dramatic effect
      vibrateSuccess(); // Use success vibration pattern for gong
    });

    return cleanup;
  }, [isConnected, on]);

  /**
   * Listen to IDLE_STATE event
   */
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = on('IDLE_STATE', (payload: unknown) => {
      console.warn('[GameState] IDLE_STATE event received:', payload);

      setGameState({
        phase: 'waiting',
        currentQuestion: null,
        correctChoice: null,
        selectedChoice: null,
        answerLocked: false,
        submitting: false,
        error: null,
        isGongActive: false,
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
    isGongActive: gameState.isGongActive,
  };
}
