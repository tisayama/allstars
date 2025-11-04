/**
 * ControlButtons Component
 * Groups all host action buttons with proper validation
 */

import { type ReactElement } from 'react';
import { ActionButton } from './ActionButton';
import { useHostActions } from '@/hooks/useHostActions';
import type { GamePhase } from '@allstars/types';
import styles from './ControlButtons.module.css';

interface ControlButtonsProps {
  sessionId: string;
  currentPhase: GamePhase | null;
}

export function ControlButtons({ sessionId, currentPhase }: ControlButtonsProps): ReactElement {
  const {
    triggerAction,
    isLoading,
    error,
    canStartQuestion,
    canShowDistribution,
    canShowCorrectAnswer,
    canShowResults,
  } = useHostActions({ sessionId, currentPhase });

  const handleStartQuestion = async () => {
    try {
      await triggerAction('START_QUESTION');
    } catch (err) {
      console.error('Failed to start question:', err);
    }
  };

  const handleShowDistribution = async () => {
    try {
      await triggerAction('SHOW_DISTRIBUTION');
    } catch (err) {
      console.error('Failed to show distribution:', err);
    }
  };

  const handleShowCorrectAnswer = async () => {
    try {
      await triggerAction('SHOW_CORRECT_ANSWER');
    } catch (err) {
      console.error('Failed to show correct answer:', err);
    }
  };

  const handleShowResults = async () => {
    try {
      await triggerAction('SHOW_RESULTS');
    } catch (err) {
      console.error('Failed to show results:', err);
    }
  };

  const handleTriggerGong = async () => {
    try {
      await triggerAction('TRIGGER_GONG');
    } catch (err) {
      console.error('Failed to trigger gong:', err);
    }
  };

  const handleReviveAll = async () => {
    try {
      await triggerAction('REVIVE_ALL');
    } catch (err) {
      console.error('Failed to revive all:', err);
    }
  };

  if (!currentPhase) {
    return (
      <div className={styles.container}>
        <div className={styles.noPhase}>
          <p>Waiting for game state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Game Controls</h3>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.primaryActions}>
        {currentPhase === 'ready_for_next' && (
          <ActionButton
            onClick={handleStartQuestion}
            disabled={!canStartQuestion || isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Start Question
          </ActionButton>
        )}

        {currentPhase === 'accepting_answers' && (
          <ActionButton
            onClick={handleShowDistribution}
            disabled={!canShowDistribution || isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Show Distribution
          </ActionButton>
        )}

        {currentPhase === 'showing_distribution' && (
          <ActionButton
            onClick={handleShowCorrectAnswer}
            disabled={!canShowCorrectAnswer || isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Show Correct Answer
          </ActionButton>
        )}

        {currentPhase === 'showing_correct_answer' && (
          <ActionButton
            onClick={handleShowResults}
            disabled={!canShowResults || isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Show Results
          </ActionButton>
        )}

        {currentPhase === 'showing_results' && (
          <ActionButton
            onClick={handleStartQuestion}
            disabled={!canStartQuestion || isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Ready for Next Question
          </ActionButton>
        )}

        {currentPhase === 'all_incorrect' && (
          <ActionButton
            onClick={handleReviveAll}
            disabled={isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Revive All Participants
          </ActionButton>
        )}

        {currentPhase === 'all_revived' && (
          <ActionButton
            onClick={handleStartQuestion}
            disabled={isLoading}
            isLoading={isLoading}
            variant="primary"
            fullWidth
          >
            Continue Game
          </ActionButton>
        )}
      </div>

      {/* Special actions available in certain phases */}
      {(currentPhase === 'accepting_answers' || currentPhase === 'showing_distribution') && (
        <div className={styles.specialActions}>
          <h4 className={styles.specialTitle}>Special Actions</h4>
          <ActionButton
            onClick={handleTriggerGong}
            disabled={isLoading}
            isLoading={isLoading}
            variant="danger"
            fullWidth
          >
            🔔 Trigger Gong
          </ActionButton>
        </div>
      )}

      <div className={styles.phaseInfo}>
        <p className={styles.phaseText}>
          Current Phase: <strong>{currentPhase}</strong>
        </p>
      </div>
    </div>
  );
}
