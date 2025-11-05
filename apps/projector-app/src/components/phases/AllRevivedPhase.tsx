import type { GameState } from '@/types';

interface AllRevivedPhaseProps {
  gameState: GameState;
}

/**
 * Revival ceremony display when all eliminated guests are brought back
 */
export function AllRevivedPhase(_props: AllRevivedPhaseProps) {
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
        🎉
      </div>

      <h1
        style={{
          fontSize: '4rem',
          marginBottom: '2rem',
          color: '#4ade80',
          textAlign: 'center',
        }}
      >
        Everyone's Back!
      </h1>

      <p
        style={{
          fontSize: '1.5rem',
          color: '#cccccc',
          maxWidth: '700px',
          textAlign: 'center',
          lineHeight: '1.6',
        }}
      >
        All eliminated guests have been revived and are back in the game!
      </p>
    </div>
  );
}
