import { useAnswerCount } from '@/hooks/useAnswerCount';
import type { GameState } from '@/types';

interface AcceptingAnswersPhaseProps {
  gameState: GameState;
}

/**
 * Question display screen with countdown timer
 */
export function AcceptingAnswersPhase({ gameState }: AcceptingAnswersPhaseProps) {
  const { currentQuestion } = gameState;
  const answerCounts = useAnswerCount(currentQuestion?.questionId ?? null);

  if (!currentQuestion) {
    return (
      <div style={{ padding: '2rem', color: '#ffffff' }}>Error: No question data available</div>
    );
  }

  return (
    <div
      data-testid="question-container"
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
        data-testid="question-number"
        style={{ marginBottom: '2rem', fontSize: '1.25rem', color: '#4a9eff' }}
      >
        {currentQuestion.period.toUpperCase()} Period - Question {currentQuestion.questionNumber}
      </div>

      <h2
        data-testid="question-text"
        style={{
          fontSize: '2.5rem',
          marginBottom: '3rem',
          maxWidth: '900px',
          textAlign: 'center',
          lineHeight: '1.4',
        }}
      >
        {currentQuestion.questionText}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          maxWidth: '800px',
          width: '100%',
        }}
      >
        {currentQuestion.choices.map((choice) => {
          const count = answerCounts?.[choice.text] ?? 0;
          return (
            <div
              key={choice.index}
              style={{
                padding: '1.5rem 2rem',
                backgroundColor: '#2a2a2a',
                borderRadius: '12px',
                fontSize: '1.5rem',
                textAlign: 'center',
                border: '2px solid #333333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{choice.text}</span>
              <span
                style={{
                  marginLeft: '1rem',
                  fontSize: '1.25rem',
                  color: '#4a9eff',
                  fontWeight: 'bold',
                }}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      <div
        data-testid="timer-display"
        style={{
          marginTop: '3rem',
          fontSize: '1.125rem',
          color: '#cccccc',
        }}
      >
        Countdown: {/* TODO: Implement countdown timer */}
        Time remaining...
      </div>

      <div
        data-testid="submission-progress"
        style={{
          marginTop: '2rem',
          fontSize: '1rem',
          color: '#888',
        }}
      >
        <span data-testid="submission-count">{answerCounts ? Object.values(answerCounts).reduce((sum, count) => sum + count, 0) : 0}</span>
        {' / '}
        <span data-testid="total-participants">{gameState.participantCount || 0}</span>
        {' submitted'}
      </div>
    </div>
  );
}
