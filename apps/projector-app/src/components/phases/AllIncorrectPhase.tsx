import type { GameState } from '@/types';

interface AllIncorrectPhaseProps {
  gameState: GameState;
}

/**
 * Prize carryover notification when all guests answer incorrectly
 */
export function AllIncorrectPhase({ gameState }: AllIncorrectPhaseProps) {
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
      <div
        style={{
          fontSize: '5rem',
          marginBottom: '2rem',
        }}
      >
        😱
      </div>

      <h1
        style={{
          fontSize: '4rem',
          marginBottom: '2rem',
          color: '#ef4444',
          textAlign: 'center',
        }}
      >
        Everyone Got It Wrong!
      </h1>

      <p
        style={{
          fontSize: '1.5rem',
          color: '#cccccc',
          marginBottom: '3rem',
          maxWidth: '700px',
          textAlign: 'center',
          lineHeight: '1.6',
        }}
      >
        No one answered correctly. The prize carries over to the next question!
      </p>

      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '2rem 4rem',
          borderRadius: '12px',
          border: '3px solid #ffd700',
        }}
      >
        <p style={{ fontSize: '1.25rem', color: '#ffd700', marginBottom: '0.5rem' }}>
          Prize Carryover
        </p>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffd700' }}>
          ¥{(gameState.prizeCarryover ?? 0).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
