import type { GameState } from '@/types';

interface ShowingCorrectAnswerPhaseProps {
  gameState: GameState;
}

/**
 * Correct answer reveal screen
 */
export function ShowingCorrectAnswerPhase({ gameState }: ShowingCorrectAnswerPhaseProps) {
  const { currentQuestion } = gameState;

  if (!currentQuestion) {
    return (
      <div style={{ padding: '2rem', color: '#ffffff' }}>Error: No question data available</div>
    );
  }

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
      <h2
        style={{
          fontSize: '2.5rem',
          marginBottom: '3rem',
          color: '#4ade80',
        }}
      >
        Correct Answer
      </h2>

      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '3rem 5rem',
          borderRadius: '12px',
          border: '4px solid #4ade80',
        }}
      >
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#4ade80' }}>
          {currentQuestion.correctAnswer}
        </p>
      </div>

      <div
        style={{
          marginTop: '3rem',
          maxWidth: '800px',
          textAlign: 'center',
          color: '#cccccc',
          fontSize: '1.25rem',
        }}
      >
        {currentQuestion.questionText}
      </div>
    </div>
  );
}
