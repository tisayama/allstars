interface RankingEntryProps {
  rank: number;
  displayName: string;
  responseTime: number;
  isHighlighted: boolean;
  highlightColor?: 'red' | 'gold';
  isPeriodChampion: boolean;
  shouldAnimate: boolean;
  animationDelay: number;
}

export function RankingEntry({
  rank,
  displayName,
  responseTime,
  isHighlighted,
  highlightColor,
  isPeriodChampion,
  shouldAnimate,
  animationDelay,
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

  return (
    <div
      className={`ranking-entry ${shouldAnimate ? 'animate-fade-in-up' : ''}`}
      style={{
        backgroundColor: getBackgroundColor(),
        ...(shouldAnimate && { animationDelay: `${animationDelay}ms` }),
      }}
    >
      <div className="rank-number">{rank}</div>
      <div className="participant-name">{displayName}</div>
      <div className="response-time">{responseTime.toFixed(2)}</div>
      {isPeriodChampion && <div className="champion-badge">★</div>}
    </div>
  );
}
