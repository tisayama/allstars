import { validateGameState } from '../../../src/utils/validator';
import { ValidationError } from '../../../src/utils/errors';

describe('GameState Validator (T041)', () => {
  describe('Valid GameState documents', () => {
    it('should accept valid GameState with accepting_answers phase', () => {
      const data = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q006',
        isGongActive: false,
        questionStartTime: 1678886400123,
        questionTimeLimit: 30,
        participants: [],
      };

      const result = validateGameState(data);

      expect(result.currentPhase).toBe('accepting_answers');
      expect(result.currentQuestionId).toBe('q006');
      expect(result.isGongActive).toBe(false);
    });

    it('should accept valid GameState with idle phase', () => {
      const data = {
        currentPhase: 'idle',
        isGongActive: false,
        participants: [],
      };

      const result = validateGameState(data);

      expect(result.currentPhase).toBe('idle');
    });

    it('should accept GameState with default isGongActive', () => {
      const data = {
        currentPhase: 'showing_distribution',
        participants: [],
      };

      const result = validateGameState(data);

      expect(result.isGongActive).toBe(false);
    });

    it('should accept GameState with additional fields (passthrough)', () => {
      const data = {
        currentPhase: 'showing_results',
        isGongActive: false,
        additionalField: 'extra-data',
        results: [{ userId: 'u1', score: 100 }],
      };

      const result = validateGameState(data);

      expect(result.additionalField).toBe('extra-data');
      expect(result.results).toEqual([{ userId: 'u1', score: 100 }]);
    });
  });

  describe('Invalid GameState documents', () => {
    it('should reject GameState with invalid phase', () => {
      const data = {
        currentPhase: 'invalid_phase',
        isGongActive: false,
      };

      expect(() => validateGameState(data)).toThrow(ValidationError);
    });

    it('should reject GameState with missing currentPhase', () => {
      const data = {
        isGongActive: false,
      };

      expect(() => validateGameState(data)).toThrow(ValidationError);
    });

    it('should reject GameState with non-boolean isGongActive', () => {
      const data = {
        currentPhase: 'idle',
        isGongActive: 'yes',
      };

      expect(() => validateGameState(data)).toThrow(ValidationError);
    });

    it('should reject accepting_answers phase without currentQuestionId', () => {
      const data = {
        currentPhase: 'accepting_answers',
        isGongActive: false,
      };

      expect(() => validateGameState(data)).toThrow(ValidationError);
      expect(() => validateGameState(data)).toThrow(
        /Question ID is required when phase is accepting_answers/
      );
    });

    it('should reject null data', () => {
      expect(() => validateGameState(null)).toThrow(ValidationError);
    });

    it('should reject non-object data', () => {
      expect(() => validateGameState('not-an-object')).toThrow(ValidationError);
    });
  });
});
