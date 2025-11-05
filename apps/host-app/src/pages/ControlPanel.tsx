/**
 * ControlPanel Component
 * Main control interface for quiz game host
 * Displays real-time game state from Firestore
 */

import { type ReactElement } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { ControlButtons } from '@/components/controls/ControlButtons';
import styles from './ControlPanel.module.css';

export function ControlPanel(): ReactElement {
  const { user, logout } = useAuth();
  const { gameState, isLoading, error } = useGameState();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Control Panel</h1>
        <div className={styles.userInfo}>
          <span className={styles.userEmail}>{user?.email}</span>
          <button onClick={handleLogout} className={styles.logoutButton} type="button">
            Logout
          </button>
        </div>
      </header>

      <main className={styles.content}>
        {isLoading && (
          <div className={styles.loadingState}>
            <p>Loading game state...</p>
          </div>
        )}

        {error && (
          <div className={styles.errorState}>
            <p className={styles.errorTitle}>Error</p>
            <p className={styles.errorMessage}>{error.message}</p>
          </div>
        )}

        {gameState && (
          <div className={styles.gameStateSection}>
            <div className={styles.gameState}>
              <div className={styles.stateCard}>
                <h3>Current Phase</h3>
                <p className={styles.phaseValue}>{gameState.currentPhase}</p>
              </div>

              <div className={styles.stateCard}>
                <h3>Current Question</h3>
                <p className={styles.questionValue}>
                  {gameState.currentQuestion
                    ? `Q${gameState.currentQuestion.questionNumber}: ${gameState.currentQuestion.questionText}`
                    : 'No active question'}
                </p>
              </div>

              <div className={styles.stateCard}>
                <h3>Gong Status</h3>
                <p className={styles.gongValue}>
                  {gameState.isGongActive ? 'Active' : 'Inactive'}
                </p>
              </div>

              {gameState.participantCount !== undefined && (
                <div className={styles.stateCard}>
                  <h3>Participants</h3>
                  <p className={styles.participantValue}>{gameState.participantCount}</p>
                </div>
              )}

              {gameState.timeRemaining !== undefined && gameState.timeRemaining !== null && (
                <div className={styles.stateCard}>
                  <h3>Time Remaining</h3>
                  <p className={styles.timeValue}>{gameState.timeRemaining}s</p>
                </div>
              )}

              <div className={styles.stateCard}>
                <h3>Last Updated</h3>
                <p className={styles.timestampValue}>
                  {(() => {
                    const timestamp = gameState.lastUpdate;
                    // Handle both Firebase Timestamp and plain object from API
                    const millis = typeof timestamp.toMillis === 'function'
                      ? timestamp.toMillis()
                      : (timestamp._seconds || timestamp.seconds || 0) * 1000;
                    return new Date(millis).toLocaleTimeString();
                  })()}
                </p>
              </div>
            </div>

            <ControlButtons currentPhase={gameState.currentPhase} />
          </div>
        )}
      </main>
    </div>
  );
}
