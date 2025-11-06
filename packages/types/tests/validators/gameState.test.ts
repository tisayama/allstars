/**
 * Unit tests for GameState validation schema
 * Following TDD - these tests should FAIL initially, then PASS after implementation
 */

import { describe, it, expect } from '@jest/globals';
import { Timestamp } from '../../src/GameState';

// Import validators that we'll create
import {
  GameStateSchema,
  GamePhaseSchema,
  TimestampSchema,
  RankedAnswerSchema,
  GameResultsSchema,
  validateGameState,
  validateGameStateSafe,
} from '../../src/validators/gameState';

describe('GamePhaseSchema', () => {
  it('should accept valid game phases', () => {
    expect(() => GamePhaseSchema.parse('ready_for_next')).not.toThrow();
    expect(() => GamePhaseSchema.parse('accepting_answers')).not.toThrow();
    expect(() => GamePhaseSchema.parse('showing_distribution')).not.toThrow();
    expect(() => GamePhaseSchema.parse('showing_correct_answer')).not.toThrow();
    expect(() => GamePhaseSchema.parse('showing_results')).not.toThrow();
    expect(() => GamePhaseSchema.parse('all_incorrect')).not.toThrow();
    expect(() => GamePhaseSchema.parse('all_revived')).not.toThrow();
  });

  it('should reject invalid game phases', () => {
    expect(() => GamePhaseSchema.parse('invalid_phase')).toThrow();
    expect(() => GamePhaseSchema.parse('')).toThrow();
    expect(() => GamePhaseSchema.parse(null)).toThrow();
  });
});

describe('TimestampSchema', () => {
  it('should accept valid Firestore Timestamp structure', () => {
    const validTimestamp = { seconds: 1699200000, nanoseconds: 123456789 };
    expect(() => TimestampSchema.parse(validTimestamp)).not.toThrow();
  });

  it('should reject invalid timestamp structures', () => {
    expect(() => TimestampSchema.parse({ seconds: 123 })).toThrow(); // missing nanoseconds
    expect(() => TimestampSchema.parse({ nanoseconds: 123 })).toThrow(); // missing seconds
    expect(() => TimestampSchema.parse({})).toThrow();
    expect(() => TimestampSchema.parse(null)).toThrow();
  });
});

describe('RankedAnswerSchema', () => {
  it('should accept valid ranked answer', () => {
    const validAnswer = {
      guestId: 'guest123',
      guestName: 'Alice',
      responseTimeMs: 1500,
    };
    expect(() => RankedAnswerSchema.parse(validAnswer)).not.toThrow();
  });

  it('should reject invalid ranked answers', () => {
    expect(() => RankedAnswerSchema.parse({ guestId: '', guestName: 'Alice', responseTimeMs: 1500 })).toThrow(); // empty guestId
    expect(() => RankedAnswerSchema.parse({ guestId: 'g1', guestName: '', responseTimeMs: 1500 })).toThrow(); // empty guestName
    expect(() => RankedAnswerSchema.parse({ guestId: 'g1', guestName: 'Alice', responseTimeMs: -100 })).toThrow(); // negative time
    expect(() => RankedAnswerSchema.parse({ guestId: 'g1', guestName: 'Alice', responseTimeMs: 1.5 })).toThrow(); // non-integer
  });
});

describe('GameResultsSchema', () => {
  const validRankedAnswer = {
    guestId: 'guest1',
    guestName: 'Alice',
    responseTimeMs: 1000,
  };

  it('should accept valid game results with required fields', () => {
    const validResults = {
      top10: [validRankedAnswer],
      worst10: [validRankedAnswer],
    };
    expect(() => GameResultsSchema.parse(validResults)).not.toThrow();
  });

  it('should accept game results with optional fields', () => {
    const resultsWithOptionals = {
      top10: [validRankedAnswer],
      worst10: [validRankedAnswer],
      periodChampions: ['guest1', 'guest2'],
      period: 'FIRST' as const,
      rankingError: false,
    };
    expect(() => GameResultsSchema.parse(resultsWithOptionals)).not.toThrow();
  });

  it('should accept empty arrays for top10 and worst10', () => {
    const emptyResults = {
      top10: [],
      worst10: [],
    };
    expect(() => GameResultsSchema.parse(emptyResults)).not.toThrow();
  });

  it('should reject invalid period values', () => {
    const invalidPeriod = {
      top10: [],
      worst10: [],
      period: 'FOURTH',
    };
    expect(() => GameResultsSchema.parse(invalidPeriod)).toThrow();
  });
});

describe('GameStateSchema', () => {
  const validTimestamp: Timestamp = {
    seconds: 1699200000,
    nanoseconds: 123456789,
    toDate: () => new Date(1699200000000),
    toMillis: () => 1699200000000
  };

  it('should accept valid gameState with all required fields', () => {
    const validGameState = {
      currentPhase: 'ready_for_next' as const,
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    expect(() => GameStateSchema.parse(validGameState)).not.toThrow();
  });

  it('should accept gameState with optional fields', () => {
    const gameStateWithOptionals = {
      currentPhase: 'accepting_answers' as const,
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
      id: 'live',
      participantCount: 10,
      timeRemaining: 30,
      results: {
        top10: [],
        worst10: [],
      },
      prizeCarryover: 10000,
      settings: {
        defaultDropoutRule: 'worst_one' as const,
        defaultRankingRule: 'time' as const,
      },
    };
    expect(() => GameStateSchema.parse(gameStateWithOptionals)).not.toThrow();
  });

  it('should reject gameState missing currentPhase', () => {
    const missingPhase = {
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    expect(() => GameStateSchema.parse(missingPhase)).toThrow();
  });

  it('should reject gameState with invalid currentPhase', () => {
    const invalidPhase = {
      currentPhase: 'invalid_phase',
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    expect(() => GameStateSchema.parse(invalidPhase)).toThrow();
  });

  it('should reject gameState missing isGongActive', () => {
    const missingGong = {
      currentPhase: 'ready_for_next',
      currentQuestion: null,
      lastUpdate: validTimestamp,
    };
    expect(() => GameStateSchema.parse(missingGong)).toThrow();
  });

  it('should reject gameState missing lastUpdate', () => {
    const missingTimestamp = {
      currentPhase: 'ready_for_next',
      currentQuestion: null,
      isGongActive: false,
    };
    expect(() => GameStateSchema.parse(missingTimestamp)).toThrow();
  });

  it('should accept null currentQuestion', () => {
    const nullQuestion = {
      currentPhase: 'ready_for_next' as const,
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    expect(() => GameStateSchema.parse(nullQuestion)).not.toThrow();
  });
});

describe('validateGameState', () => {
  const validTimestamp: Timestamp = {
    seconds: 1699200000,
    nanoseconds: 123456789,
    toDate: () => new Date(1699200000000),
    toMillis: () => 1699200000000
  };

  it('should return validated data for valid gameState', () => {
    const validData = {
      currentPhase: 'ready_for_next' as const,
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    const result = validateGameState(validData);
    expect(result).toEqual(validData);
  });

  it('should throw error for invalid gameState', () => {
    const invalidData = {
      currentPhase: 'invalid',
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    expect(() => validateGameState(invalidData)).toThrow();
  });
});

describe('validateGameStateSafe', () => {
  const validTimestamp: Timestamp = {
    seconds: 1699200000,
    nanoseconds: 123456789,
    toDate: () => new Date(1699200000000),
    toMillis: () => 1699200000000
  };

  it('should return success:true for valid gameState', () => {
    const validData = {
      currentPhase: 'ready_for_next' as const,
      currentQuestion: null,
      isGongActive: false,
      lastUpdate: validTimestamp,
    };
    const result = validateGameStateSafe(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  it('should return success:false for invalid gameState', () => {
    const invalidData = {
      currentPhase: 'invalid',
      currentQuestion: null,
      isGongActive: false,
    };
    const result = validateGameStateSafe(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should provide detailed error messages', () => {
    const invalidData = {
      currentPhase: 'invalid',
      currentQuestion: null,
      // missing isGongActive
      // missing lastUpdate
    };
    const result = validateGameStateSafe(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
