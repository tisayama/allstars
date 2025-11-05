/**
 * useGameState Hook
 * Manages real-time Firestore listener for game state updates
 * Falls back to API if Firestore document doesn't exist
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { useAuth } from './useAuth';
import type { GameState } from '@allstars/types';

const GAME_STATE_COLLECTION = 'gameState';
const GAME_STATE_DOC_ID = 'live';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/allstars-wedding-quiz/us-central1';

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
 * Connects to singleton gameState/live document (consistent with API server)
 * Falls back to API endpoint if document doesn't exist yet
 */
export function useGameState(): UseGameStateReturn {
  const { user } = useAuth();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track previous phase for logging
  const previousPhaseRef = useRef<string | null>(null);
  const hasTriedApiFallback = useRef(false);

  /**
   * Fetch game state from API as fallback
   */
  const fetchFromApi = useCallback(async () => {
    if (!user?.idToken || hasTriedApiFallback.current) return;

    hasTriedApiFallback.current = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/host/game/state`, {
        headers: {
          'Authorization': `Bearer ${user.idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (validateGameState(data)) {
          setGameState(data as GameState);
          setIsLoading(false);
          setError(null);
          logger.gameState.phaseChange('unknown', data.currentPhase, 'api_fetch');
        }
      }
    } catch (err) {
      logger.error(err as Error, { context: 'fetchFromApi' });
      // Don't set error here, let Firestore listener handle it
    }
  }, [user]);

  /**
   * Handle snapshot updates
   */
  const handleSnapshot = useCallback(
    (snapshot: DocumentSnapshot) => {
      try {
        if (!snapshot.exists()) {
          // Document doesn't exist yet - try to fetch from API
          if (!hasTriedApiFallback.current) {
            fetchFromApi();
          } else {
            // Already tried API, still no data
            setError(new Error('Game state not initialized. Please start a question from admin panel.'));
            setIsLoading(false);
          }
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
        logger.error(error, { context: 'handleSnapshot' });
        setError(error);
        setIsLoading(false);
      }
    },
    [error, fetchFromApi]
  );

  /**
   * Handle listener errors
   */
  const handleError = useCallback((err: Error) => {
    logger.firestore.listenerError(err);
    setError(err);
    setIsLoading(false);
  }, []);

  /**
   * Set up Firestore listener
   */
  useEffect(() => {
    if (!user) return;

    // Reset state on mount
    setIsLoading(true);
    setError(null);
    setGameState(null);
    previousPhaseRef.current = null;
    hasTriedApiFallback.current = false;

    const gameStateRef = doc(firestore, GAME_STATE_COLLECTION, GAME_STATE_DOC_ID);

    // Set up real-time listener
    const unsubscribe = onSnapshot(gameStateRef, handleSnapshot, handleError);

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [user, handleSnapshot, handleError]);

  return {
    gameState,
    isLoading,
    error,
  };
}
