/**
 * Game settings entity
 * Configuration for game rules stored in gameState/live document
 */

export type DropoutRule = 'period' | 'worst_one';
export type RankingRule = 'time' | 'point';

export interface GameSettings {
  /** How players are eliminated: "period" (per round) or "worst_one" (slowest/worst each question) */
  defaultDropoutRule: DropoutRule;

  /** How players are ranked: "time" (fastest correct) or "point" (total points) */
  defaultRankingRule: RankingRule;
}
