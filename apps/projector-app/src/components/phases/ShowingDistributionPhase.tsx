import { useAnswerCount } from '@/hooks/useAnswerCount';
import type { GameState } from '@/types';

interface ShowingDistributionPhaseProps {
  gameState: GameState;
}

/**
 * Answer distribution display (simple text-based count list)
 */
export function ShowingDistributionPhase({ gameState }: ShowingDistributionPhaseProps) {
  const { currentQuestion } = gameState;
  const answerCounts = useAnswerCount(currentQuestion?.questionId ?? null);

  if (!currentQuestion) {
    return (
      <div style={{ padding: '2rem', color: '#ffffff' }}>Error: No question data available</div>
    );
  }

  // Build answer counts from real-time data
  const answerCountsDisplay = currentQuestion.choices.map((choice) => ({
    choice: choice.text,
    count: answerCounts?.[choice.text] ?? 0,
  }));

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
          color: '#4a9eff',
        }}
      >
        Answer Distribution
      </h2>

      <div
        style={{
          backgroundColor: '#2a2a2a',
          padding: '3rem',
          borderRadius: '12px',
          minWidth: '500px',
        }}
      >
        {answerCountsDisplay.map(({ choice, count }, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1rem 0',
              fontSize: '2rem',
              borderBottom: index < answerCountsDisplay.length - 1 ? '1px solid #444444' : 'none',
            }}
          >
            <span>{choice}</span>
            <span style={{ color: '#4a9eff', fontWeight: 'bold' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
