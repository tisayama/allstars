import type { GameResults, RankedAnswer, GamePeriod } from '@allstars/types';

export interface RankingEntry {
  rank: number;
  guestId: string;
  displayName: string;
  responseTime: number;
  isHighlighted: boolean;
  highlightColor?: 'red' | 'gold';
  isPeriodChampion: boolean;
}

export interface RankingDisplayConfig {
  title: string;
  entries: RankingEntry[];
  period?: GamePeriod;
  showPeriodChampions: boolean;
  periodChampions: string[];
  type: 'worst10' | 'top10';
}

/**
 * Truncate string to max length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Convert milliseconds to seconds with 2 decimal places
 */
export function msToSeconds(ms: number): number {
  return Number((ms / 1000).toFixed(2));
}

/**
 * Determine if ranking entry should be highlighted
 */
export function shouldHighlight(
  index: number,
  total: number,
  type: 'worst10' | 'top10'
): boolean {
  if (type === 'worst10') {
    return index === total - 1; // Last entry (slowest)
  } else {
    return index === 0; // First entry (fastest)
  }
}

/**
 * Get highlight color for ranking entry
 */
export function getHighlightColor(
  type: 'worst10' | 'top10',
  isHighlighted: boolean
): 'red' | 'gold' | undefined {
  if (!isHighlighted) return undefined;
  return type === 'worst10' ? 'red' : 'gold';
}

/**
 * Transform RankedAnswer to RankingEntry
 */
export function toRankingEntry(
  rankedAnswer: RankedAnswer,
  rank: number,
  isHighlighted: boolean,
  highlightColor: 'red' | 'gold' | undefined,
  periodChampions: string[] = []
): RankingEntry {
  return {
    rank,
    guestId: rankedAnswer.guestId,
    displayName: truncate(rankedAnswer.guestName, 50),
    responseTime: msToSeconds(rankedAnswer.responseTimeMs),
    isHighlighted,
    highlightColor,
    isPeriodChampion: periodChampions.includes(rankedAnswer.guestId),
  };
}

/**
 * Create worst10 ranking configuration
 */
export function createWorst10Config(results: GameResults): RankingDisplayConfig {
  const entries = results.worst10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      shouldHighlight(index, results.worst10.length, 'worst10'),
      getHighlightColor(
        'worst10',
        shouldHighlight(index, results.worst10.length, 'worst10')
      ),
      results.periodChampions || []
    )
  );

  return {
    title: '早押しワースト10',
    entries,
    period: results.period,
    showPeriodChampions: false, // Never show champions on worst10
    periodChampions: [],
    type: 'worst10',
  };
}

/**
 * Create top10 ranking configuration
 */
export function createTop10Config(results: GameResults): RankingDisplayConfig {
  const entries = results.top10.map((answer, index) =>
    toRankingEntry(
      answer,
      index + 1,
      shouldHighlight(index, results.top10.length, 'top10'),
      getHighlightColor(
        'top10',
        shouldHighlight(index, results.top10.length, 'top10')
      ),
      results.periodChampions || []
    )
  );

  return {
    title: '早押しトップ10',
    entries,
    period: results.period,
    showPeriodChampions: Array.isArray(results.periodChampions) && results.periodChampions.length > 0,
    periodChampions: results.periodChampions || [],
    type: 'top10',
  };
}
