import type { GameState } from '@/types';

interface ShowingResultsPhaseProps {
  gameState: GameState;
}

/**
 * Ranking results display (top 10 and worst 10)
 * T059-T064: Conditional rendering based on isGongActive flag
 */
export function ShowingResultsPhase({ gameState }: ShowingResultsPhaseProps) {
  const results = gameState.results;
  const isPeriodFinal = gameState.isGongActive;

  if (!results) {
    return (
      <div style={{ padding: '2rem', color: '#ffffff' }}>Error: No results data available</div>
    );
  }

  // T062: Check if there are period champions
  const hasPeriodChampions = results.periodChampions && results.periodChampions.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: '3rem',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '3rem', color: '#4a9eff' }}>
        Results
        {hasPeriodChampions && results.period && (
          <span style={{ fontSize: '1.5rem', marginLeft: '1rem', color: '#fbbf24' }}>
            ({results.period === 'first-half' ? 'First Half' : 'Second Half'} Final)
          </span>
        )}
      </h1>

      <div style={{ display: 'flex', gap: '3rem', width: '100%', maxWidth: '1400px' }}>
        {/* T060: Hide Top 10 section when isGongActive is false */}
        {/* T062: Display period champion badge for periodChampions */}
        {isPeriodFinal && (
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: '2rem',
                marginBottom: '1.5rem',
                color: '#4ade80',
                textAlign: 'center',
              }}
            >
              Top 10 (Fastest Correct)
            </h2>
            <div style={{ backgroundColor: '#2a2a2a', borderRadius: '12px', padding: '1.5rem' }}>
              {/* T064: Handle variable-length arrays (ties exceed 10) */}
              {results.top10.map((entry, index) => {
                const isChampion = results.periodChampions?.includes(entry.guestId);
                return (
                  <div
                    key={entry.guestId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      borderBottom: index < results.top10.length - 1 ? '1px solid #444444' : 'none',
                      backgroundColor: isChampion ? '#2a4a2a' : 'transparent',
                      borderRadius: isChampion ? '8px' : '0',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {index + 1}. {entry.guestName}
                      {isChampion && (
                        <span
                          style={{
                            fontSize: '1.5rem',
                            color: '#fbbf24',
                            fontWeight: 'bold',
                          }}
                          title="Period Champion"
                        >
                          👑
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '1.25rem', color: '#4ade80' }}>
                      {(entry.responseTimeMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                );
              })}
              {results.top10.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888888' }}>No correct answers</p>
              )}
            </div>
          </div>
        )}

        {/* T061: Hide Worst 10 section when isGongActive is true */}
        {!isPeriodFinal && (
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: '2rem',
                marginBottom: '1.5rem',
                color: '#ef4444',
                textAlign: 'center',
              }}
            >
              Worst 10 (Slowest Correct)
            </h2>
            <div style={{ backgroundColor: '#2a2a2a', borderRadius: '12px', padding: '1.5rem' }}>
              {/* T064: Handle variable-length arrays (ties exceed 10) */}
              {results.worst10.map((entry, index) => (
                <div
                  key={entry.guestId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '1rem',
                    borderBottom: index < results.worst10.length - 1 ? '1px solid #444444' : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>
                    {index + 1}. {entry.guestName}
                  </span>
                  <span style={{ fontSize: '1.25rem', color: '#ef4444' }}>
                    {(entry.responseTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              ))}
              {results.worst10.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888888' }}>No entries</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* T063: Display error state UI when rankingError is true */}
      {results.rankingError && (
        <div
          style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#5a3a3a',
            borderRadius: '8px',
            color: '#ff6666',
          }}
        >
          Warning: Ranking calculation incomplete
        </div>
      )}
    </div>
  );
}
