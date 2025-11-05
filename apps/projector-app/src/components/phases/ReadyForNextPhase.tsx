import type { GameState } from '@/types';

interface ReadyForNextPhaseProps {
  gameState: GameState;
}

/**
 * Idle screen displayed between questions
 */
export function ReadyForNextPhase({ gameState }: ReadyForNextPhaseProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '4rem', marginBottom: '2rem', color: '#4a9eff' }}>AllStars Quiz</h1>
      <p style={{ fontSize: '1.5rem', color: '#cccccc' }}>Get ready for the next question...</p>
      {(gameState.prizeCarryover ?? 0) > 0 && (
        <div
          style={{
            marginTop: '3rem',
            padding: '2rem',
            backgroundColor: '#2a2a2a',
            borderRadius: '12px',
          }}
        >
          <p style={{ fontSize: '1.25rem', color: '#ffd700' }}>
            Prize Carryover: ¥{(gameState.prizeCarryover ?? 0).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
