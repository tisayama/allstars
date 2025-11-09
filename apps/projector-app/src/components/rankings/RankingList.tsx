import { RankingEntry } from './RankingEntry';
import type { RankingDisplayConfig } from '../../utils/rankingHelpers';

interface RankingListProps {
  config: RankingDisplayConfig;
  animationsEnabled: boolean;
  isWorst10: boolean;
}

/**
 * Stagger delay between ranking entries (in milliseconds)
 */
const STAGGER_DELAY_MS = 100;

export function RankingList({ config, animationsEnabled, isWorst10 }: RankingListProps) {
  const containerTestId = isWorst10 ? 'worst10-container' : 'rankings-list';
  const listTestId = isWorst10 ? 'worst10-list' : 'rankings-list';

  return (
    <div className="ranking-list" data-testid={containerTestId}>
      <div className="ranking-label">
        <div className="vertical-text">{config.title}</div>
      </div>
      <div className="ranking-entries" data-testid={listTestId}>
        {config.entries.map((entry, index) => (
          <RankingEntry
            key={entry.guestId}
            guestId={entry.guestId}
            rank={entry.rank}
            displayName={entry.displayName}
            responseTime={entry.responseTime}
            isHighlighted={entry.isHighlighted}
            highlightColor={entry.highlightColor}
            isPeriodChampion={entry.isPeriodChampion}
            shouldAnimate={animationsEnabled}
            animationDelay={index * STAGGER_DELAY_MS}
            isWorst10={isWorst10}
          />
        ))}
      </div>
    </div>
  );
}
