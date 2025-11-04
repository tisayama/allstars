/**
 * useGameState Hook
 * Manages real-time Firestore listener for game state updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import type { GameState } from '@allstars/types';

const GAME_SESSIONS_COLLECTION = 'game-sessions';

interface UseGameStateReturn {
  gameState: GameState | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Validates game state data structure
 */
function validateGameState(data: unknown): data is GameState {
  if (!data || typeof data !== 'object') return false;

  const state = data as Record<string, unknown>;

  // Check required fields
  if (typeof state['currentPhase'] !== 'string') return false;
  if (typeof state['isGongActive'] !== 'boolean') return false;
  if (!state['lastUpdate']) return false;

  // currentQuestion can be null or object
  if (state['currentQuestion'] !== null && typeof state['currentQuestion'] !== 'object') {
    return false;
  }

  return true;
}

/**
 * Custom hook for real-time game state from Firestore
 * Provides live updates, error handling, and reconnection logic
 */
export function useGameState(sessionId: string): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track previous phase for logging
  const previousPhaseRef = useRef<string | null>(null);

  /**
   * Handle snapshot updates
   */
  const handleSnapshot = useCallback(
    (snapshot: DocumentSnapshot) => {
      try {
        if (!snapshot.exists()) {
          setError(new Error('Game session not found'));
          setGameState(null);
          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        if (!validateGameState(data)) {
          setError(new Error('Invalid game state data received from Firestore'));
          setIsLoading(false);
          return;
        }

        // Clear error on successful update (reconnection)
        if (error) {
          logger.firestore.reconnected();
          setError(null);
        }

        // Log phase changes
        if (previousPhaseRef.current && previousPhaseRef.current !== data.currentPhase) {
          logger.gameState.phaseChange(
            previousPhaseRef.current,
            data.currentPhase,
            'firestore_update'
          );
        }
        previousPhaseRef.current = data.currentPhase;

        setGameState(data as GameState);
        setIsLoading(false);
      } catch (err) {
        const error = err as Error;
        logger.error(error, { context: 'handleSnapshot', sessionId });
        setError(error);
        setIsLoading(false);
      }
    },
    [error, sessionId]
  );

  /**
   * Handle listener errors
   */
  const handleError = useCallback(
    (err: Error) => {
      logger.firestore.listenerError(err);
      setError(err);
      setIsLoading(false);
    },
    []
  );

  /**
   * Set up Firestore listener
   */
  useEffect(() => {
    // Validate session ID
    if (!sessionId || sessionId.trim() === '') {
      setError(new Error('Session ID required'));
      setIsLoading(false);
      return;
    }

    // Reset state when session changes
    setIsLoading(true);
    setError(null);
    setGameState(null);
    previousPhaseRef.current = null;

    const sessionRef = doc(firestore, GAME_SESSIONS_COLLECTION, sessionId);

    // Set up real-time listener
    const unsubscribe = onSnapshot(sessionRef, handleSnapshot, handleError);

    // Cleanup on unmount or session change
    return () => {
      unsubscribe();
    };
  }, [sessionId, handleSnapshot, handleError]);

  return {
    gameState,
    isLoading,
    error,
  };
}
