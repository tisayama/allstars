/**
 * ControlPanel Component
 * Main control interface for quiz game host
 * Displays real-time game state from Firestore
 */

import { useState, type ReactElement } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameState } from '@/hooks/useGameState';
import { ControlButtons } from '@/components/controls/ControlButtons';
import styles from './ControlPanel.module.css';

export function ControlPanel(): ReactElement {
  const { user, logout } = useAuth();
  const [sessionId, setSessionId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const { gameState, isLoading, error } = useGameState(activeSessionId);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleConnect = () => {
    if (sessionId.trim()) {
      setActiveSessionId(sessionId.trim());
    }
  };

  const handleDisconnect = () => {
    setActiveSessionId('');
    setSessionId('');
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
        {!activeSessionId ? (
          <div className={styles.connectSection}>
            <h2>Connect to Game Session</h2>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID"
                className={styles.input}
              />
              <button
                onClick={handleConnect}
                disabled={!sessionId.trim()}
                className={styles.connectButton}
                type="button"
              >
                Connect
              </button>
            </div>
            <p className={styles.hint}>Enter a game session ID to view real-time state updates</p>
          </div>
        ) : (
          <div className={styles.gameStateSection}>
            <div className={styles.sessionHeader}>
              <h2>Session: {activeSessionId}</h2>
              <button onClick={handleDisconnect} className={styles.disconnectButton} type="button">
                Disconnect
              </button>
            </div>

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
                    {new Date(gameState.lastUpdate.toMillis()).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {gameState && (
              <ControlButtons sessionId={activeSessionId} currentPhase={gameState.currentPhase} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
