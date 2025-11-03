import { mapToSocketEvent } from '../../../src/events/eventMapper';

describe('Event Mapper', () => {
  describe('START_QUESTION event mapping (T035)', () => {
    it('should map accepting_answers phase to START_QUESTION event', () => {
      const gameState = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q006',
        isGongActive: false,
        questionStartTime: 1678886400123,
        questionTimeLimit: 30,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'START_QUESTION',
        payload: {
          questionId: 'q006',
          serverStartTime: expect.any(Number),
        },
      });
      expect(result.payload.serverStartTime).toBeGreaterThan(0);
    });

    it('should include currentQuestionId in START_QUESTION payload', () => {
      const gameState = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q012',
        isGongActive: false,
        questionStartTime: Date.now(),
        questionTimeLimit: 30,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result.eventName).toBe('START_QUESTION');
      expect(result.payload.questionId).toBe('q012');
    });

    it('should use current timestamp for serverStartTime', () => {
      const before = Date.now();
      const gameState = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q999',
        isGongActive: false,
        questionStartTime: Date.now(),
        questionTimeLimit: 30,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);
      const after = Date.now();

      expect(result.payload.serverStartTime).toBeGreaterThanOrEqual(before);
      expect(result.payload.serverStartTime).toBeLessThanOrEqual(after);
    });

    it('should throw error if currentQuestionId is missing for accepting_answers phase', () => {
      const gameState: any = {
        currentPhase: 'accepting_answers',
        isGongActive: false,
        questionStartTime: Date.now(),
        questionTimeLimit: 30,
        participants: [],
      };

      expect(() => mapToSocketEvent(gameState)).toThrow();
    });
  });

  describe('GAME_PHASE_CHANGED event mapping (T050-T053)', () => {
    it('should map showing_distribution phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'showing_distribution',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'showing_distribution',
        },
      });
    });

    it('should map showing_correct_answer phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'showing_correct_answer',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'showing_correct_answer',
        },
      });
    });

    it('should map showing_results phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'showing_results',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'showing_results',
        },
      });
    });

    it('should map all_revived phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'all_revived',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'all_revived',
        },
      });
    });

    it('should map idle phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'idle',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'idle',
        },
      });
    });

    it('should map all_incorrect phase to GAME_PHASE_CHANGED event', () => {
      const gameState = {
        currentPhase: 'all_incorrect',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GAME_PHASE_CHANGED',
        payload: {
          newPhase: 'all_incorrect',
        },
      });
    });
  });

  describe('GONG_ACTIVATED event mapping (T065)', () => {
    it('should map isGongActive=true to GONG_ACTIVATED event', () => {
      const gameState = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q999',
        isGongActive: true,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GONG_ACTIVATED',
        payload: {},
      });
    });

    it('should prioritize GONG_ACTIVATED over START_QUESTION when both conditions are true', () => {
      const gameState = {
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q001',
        isGongActive: true,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result.eventName).toBe('GONG_ACTIVATED');
    });

    it('should map isGongActive=true with any phase to GONG_ACTIVATED', () => {
      const gameState = {
        currentPhase: 'showing_distribution',
        isGongActive: true,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result).toEqual({
        eventName: 'GONG_ACTIVATED',
        payload: {},
      });
    });

    it('should not emit GONG_ACTIVATED when isGongActive=false', () => {
      const gameState = {
        currentPhase: 'idle',
        isGongActive: false,
        participants: [],
      };

      const result = mapToSocketEvent(gameState);

      expect(result.eventName).not.toBe('GONG_ACTIVATED');
    });
  });

  describe('IDLE_STATE event mapping (T085)', () => {
    it('should map null gameState to IDLE_STATE event', () => {
      const result = mapToSocketEvent(null);

      expect(result).toEqual({
        eventName: 'IDLE_STATE',
        payload: {},
      });
    });

    it('should map undefined gameState to IDLE_STATE event', () => {
      const result = mapToSocketEvent(undefined);

      expect(result).toEqual({
        eventName: 'IDLE_STATE',
        payload: {},
      });
    });
  });
});
