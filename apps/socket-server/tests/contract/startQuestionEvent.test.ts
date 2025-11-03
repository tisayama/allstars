import { isStartQuestionPayload } from '@allstars/types';

describe('START_QUESTION Event Payload Contract (T037)', () => {
  describe('isStartQuestionPayload type guard', () => {
    it('should accept valid START_QUESTION payload', () => {
      const payload = {
        questionId: 'q006',
        serverStartTime: 1678886400123,
      };

      expect(isStartQuestionPayload(payload)).toBe(true);
    });

    it('should accept payload with different questionId format', () => {
      const payload = {
        questionId: 'question-abc-123',
        serverStartTime: Date.now(),
      };

      expect(isStartQuestionPayload(payload)).toBe(true);
    });

    it('should reject payload with missing questionId', () => {
      const payload = {
        serverStartTime: 1678886400123,
      };

      expect(isStartQuestionPayload(payload)).toBe(false);
    });

    it('should reject payload with missing serverStartTime', () => {
      const payload = {
        questionId: 'q006',
      };

      expect(isStartQuestionPayload(payload)).toBe(false);
    });

    it('should reject payload with non-string questionId', () => {
      const payload = {
        questionId: 123,
        serverStartTime: 1678886400123,
      };

      expect(isStartQuestionPayload(payload)).toBe(false);
    });

    it('should reject payload with non-number serverStartTime', () => {
      const payload = {
        questionId: 'q006',
        serverStartTime: '1678886400123',
      };

      expect(isStartQuestionPayload(payload)).toBe(false);
    });

    it('should reject null payload', () => {
      expect(isStartQuestionPayload(null)).toBe(false);
    });

    it('should reject undefined payload', () => {
      expect(isStartQuestionPayload(undefined)).toBe(false);
    });

    it('should reject non-object payload', () => {
      expect(isStartQuestionPayload('not-an-object')).toBe(false);
      expect(isStartQuestionPayload(42)).toBe(false);
    });

    it('should reject empty object payload', () => {
      expect(isStartQuestionPayload({})).toBe(false);
    });
  });
});
