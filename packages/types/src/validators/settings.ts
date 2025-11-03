/**
 * Zod validation schema for GameSettings entity
 */

import { z } from 'zod';

export const dropoutRuleSchema = z.enum(['period', 'worst_one']);

export const rankingRuleSchema = z.enum(['time', 'point']);

export const gameSettingsSchema = z.object({
  defaultDropoutRule: dropoutRuleSchema,
  defaultRankingRule: rankingRuleSchema,
});

export type GameSettingsInput = z.infer<typeof gameSettingsSchema>;
