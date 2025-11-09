import type { Socket } from 'socket.io-client';
import type { GameResults } from '@allstars/types';
import { TVBackground } from './TVBackground';
import { TVBranding } from './TVBranding';
import { RankingList } from './RankingList';
import { ConnectionIndicator } from './ConnectionIndicator';
import { useFPSMonitor } from '../../hooks/useFPSMonitor';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { useRankingAnimation } from '../../hooks/useRankingAnimation';
import { createWorst10Config, createTop10Config } from '../../utils/rankingHelpers';

interface TVRankingDisplayProps {
  results: GameResults | null | undefined;
  isGongActive: boolean;
  socket: Socket | null;
  questionId?: string;
}

/**
 * TV-style ranking display container
 *
 * Orchestrates all ranking sub-components with performance monitoring,
 * connection status tracking, and animation management.
 */
export function TVRankingDisplay({
  results,
  isGongActive,
  socket,
  questionId,
}: TVRankingDisplayProps) {
  const { isDegraded } = useFPSMonitor();
  const { showIndicator } = useConnectionStatus(socket);
  const { shouldAnimate, markAsPlayed } = useRankingAnimation(questionId);

  // Determine if animations should be enabled (good FPS and not degraded)
  const animationsEnabled = !isDegraded;

  // Mark question as played on mount if should animate
  if (shouldAnimate && questionId) {
    markAsPlayed();
  }

  // Handle missing results
  if (!results) {
    return (
      <div className="tv-ranking-container">
        <TVBackground animationsEnabled={animationsEnabled} />
        <TVBranding logoUrl="/assets/show-logo.svg" showLiveBadge={true} period={undefined} />
        <div className="rankings-content">{/* Empty state - no results */}</div>
      </div>
    );
  }

  // Transform results to display configs
  const worst10Config = createWorst10Config(results);
  const top10Config = results.top10?.length > 0 ? createTop10Config(results) : null;

  return (
    <div
      className="tv-ranking-container"
      data-testid="rankings-container"
      data-animated={shouldAnimate ? 'true' : 'false'}
    >
      <TVBackground animationsEnabled={animationsEnabled} />

      <TVBranding logoUrl="/assets/show-logo.svg" showLiveBadge={true} period={results.period} />

      <div className="rankings-content">
        {/* Worst 10 Rankings - Always shown */}
        <RankingList config={worst10Config} animationsEnabled={shouldAnimate} isWorst10={true} />

        {/* Top 10 Rankings - Only shown when gong is active */}
        {isGongActive && top10Config && (
          <RankingList config={top10Config} animationsEnabled={shouldAnimate} isWorst10={false} />
        )}
      </div>

      {/* Connection indicator - shown when disconnected */}
      {showIndicator && <ConnectionIndicator isVisible={showIndicator} />}
    </div>
  );
}
