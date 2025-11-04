/**
 * useHostActions Hook
 * Provides methods to trigger host actions via API
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { sendHostActionWithRetry, ApiError } from '@/lib/api-client';
import type { HostAction, HostActionRequest, GamePhase } from '@allstars/types';

interface UseHostActionsOptions {
  sessionId: string;
  currentPhase: GamePhase | null;
}

interface UseHostActionsReturn {
  triggerAction: (action: HostAction, payload?: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  canStartQuestion: boolean;
  canShowDistribution: boolean;
  canShowCorrectAnswer: boolean;
  canShowResults: boolean;
}

/**
 * Validates if an action is allowed in the current phase
 */
function isActionAllowed(action: HostAction, currentPhase: GamePhase | null): boolean {
  if (!currentPhase) return false;

  const allowedTransitions: Record<GamePhase, HostAction[]> = {
    'ready_for_next': ['START_QUESTION'],
    'accepting_answers': ['SHOW_DISTRIBUTION', 'TRIGGER_GONG'],
    'showing_distribution': ['SHOW_CORRECT_ANSWER', 'TRIGGER_GONG'],
    'showing_correct_answer': ['SHOW_RESULTS'],
    'showing_results': ['ready_for_next'],
    'all_incorrect': ['REVIVE_ALL'],
    'all_revived': ['ready_for_next'],
  };

  return allowedTransitions[currentPhase]?.includes(action) || false;
}

/**
 * Custom hook for triggering host actions
 * Integrates with authentication and validates actions against current phase
 */
export function useHostActions({ sessionId, currentPhase }: UseHostActionsOptions): UseHostActionsReturn {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Trigger a host action
   */
  const triggerAction = useCallback(
    async (action: HostAction, payload?: Record<string, unknown>) => {
      if (!user?.idToken) {
        setError('Not authenticated');
        throw new Error('Not authenticated');
      }

      if (!sessionId) {
        setError('No session connected');
        throw new Error('No session connected');
      }

      // Validate action is allowed in current phase
      if (!isActionAllowed(action, currentPhase)) {
        const errorMsg = `Action "${action}" not allowed in phase "${currentPhase}"`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: HostActionRequest = {
          action,
          payload,
        };

        await sendHostActionWithRetry(sessionId, request, user.idToken);

        // Clear error on success
        setError(null);
      } catch (err) {
        const error = err as Error;
        const errorMessage = error instanceof ApiError
          ? error.message
          : 'Failed to execute action';

        setError(errorMessage);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [user, sessionId, currentPhase]
  );

  // Compute which actions are currently allowed
  const canStartQuestion = isActionAllowed('START_QUESTION', currentPhase);
  const canShowDistribution = isActionAllowed('SHOW_DISTRIBUTION', currentPhase);
  const canShowCorrectAnswer = isActionAllowed('SHOW_CORRECT_ANSWER', currentPhase);
  const canShowResults = isActionAllowed('SHOW_RESULTS', currentPhase);

  return {
    triggerAction,
    isLoading,
    error,
    canStartQuestion,
    canShowDistribution,
    canShowCorrectAnswer,
    canShowResults,
  };
}
