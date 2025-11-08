import { RankingEntry } from './RankingEntry';
import type { RankingDisplayConfig } from '../../utils/rankingHelpers';

interface RankingListProps {
  config: RankingDisplayConfig;
  animationsEnabled: boolean;
}

/**
 * Stagger delay between ranking entries (in milliseconds)
 */
const STAGGER_DELAY_MS = 100;

export function RankingList({ config, animationsEnabled }: RankingListProps) {
  return (
    <div className="ranking-list">
      <div className="ranking-label">
        <div className="vertical-text">{config.title}</div>
      </div>
      <div className="ranking-entries">
        {config.entries.map((entry, index) => (
          <RankingEntry
            key={entry.guestId}
            rank={entry.rank}
            displayName={entry.displayName}
            responseTime={entry.responseTime}
            isHighlighted={entry.isHighlighted}
            highlightColor={entry.highlightColor}
            isPeriodChampion={entry.isPeriodChampion}
            shouldAnimate={animationsEnabled}
            animationDelay={index * STAGGER_DELAY_MS}
          />
        ))}
      </div>
    </div>
  );
}
