interface RankingEntryProps {
  guestId: string;
  rank: number;
  displayName: string;
  responseTime: number;
  isHighlighted: boolean;
  highlightColor?: 'red' | 'gold';
  isPeriodChampion: boolean;
  shouldAnimate: boolean;
  animationDelay: number;
  isWorst10: boolean;
}

export function RankingEntry({
  guestId,
  rank,
  displayName,
  responseTime,
  isHighlighted,
  highlightColor,
  isPeriodChampion,
  shouldAnimate,
  animationDelay,
  isWorst10,
}: RankingEntryProps) {
  const getBackgroundColor = (): string => {
    if (isHighlighted && highlightColor === 'red') {
      return 'rgba(239, 68, 68, 0.3)'; // Red for worst
    }
    if (isHighlighted && highlightColor === 'gold') {
      return 'rgba(250, 204, 21, 0.3)'; // Gold for best
    }
    return 'rgba(59, 130, 246, 0.2)'; // Default blue
  };

  const entryPrefix = isWorst10 ? 'worst10-entry' : 'ranking-entry';
  const nameTestId = isWorst10 ? 'worst10-name' : 'ranking-name';
  const scoreTestId = isWorst10 ? 'worst10-score' : 'ranking-score';
  const timeTestId = isWorst10 ? 'worst10-response-time' : 'ranking-response-time';
  const isFastest = isHighlighted && highlightColor === 'gold';

  return (
    <div
      className={`ranking-entry ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
      data-testid={`${entryPrefix}-${guestId}`}
      data-rank={rank}
      data-fastest={isFastest ? 'true' : 'false'}
      data-period-champion={isPeriodChampion ? 'true' : 'false'}
      style={{
        backgroundColor: getBackgroundColor(),
        ...(shouldAnimate && { animationDelay: `${animationDelay}ms` }),
      }}
    >
      <div className="rank-number">{rank}</div>
      <div className="participant-name" data-testid={nameTestId}>{displayName}</div>
      <div className="score" data-testid={scoreTestId}>{rank}</div>
      <div className="response-time" data-testid={timeTestId}>{responseTime.toFixed(2)}</div>
      {isFastest && <div className="fastest-badge" data-testid="fastest-badge">⚡</div>}
      {isPeriodChampion && <div className="champion-badge" data-testid="period-champion-badge">★</div>}
    </div>
  );
}
