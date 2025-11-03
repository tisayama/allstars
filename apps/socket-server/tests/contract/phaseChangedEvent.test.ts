/**
 * Contract test for GAME_PHASE_CHANGED event payload (T054)
 * Verifies the event conforms to the SocketEvents contract
 */
import type {
  GamePhaseChangedPayload,
  GamePhase,
} from '@allstars/types';
import { isGamePhaseChangedPayload } from '@allstars/types';

describe('GAME_PHASE_CHANGED Contract Test (T054)', () => {
  describe('Valid GAME_PHASE_CHANGED payloads', () => {
    it('should accept valid payload with showing_distribution phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'showing_distribution',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
      expect(payload.newPhase).toBe('showing_distribution');
    });

    it('should accept valid payload with showing_correct_answer phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'showing_correct_answer',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
    });

    it('should accept valid payload with showing_results phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'showing_results',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
    });

    it('should accept valid payload with idle phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'idle',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
    });

    it('should accept valid payload with all_incorrect phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'all_incorrect',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
    });

    it('should accept valid payload with all_revived phase', () => {
      const payload: GamePhaseChangedPayload = {
        newPhase: 'all_revived',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(true);
    });
  });

  describe('Invalid GAME_PHASE_CHANGED payloads', () => {
    it('should reject payload with invalid phase', () => {
      const payload = {
        newPhase: 'invalid_phase',
      };

      expect(isGamePhaseChangedPayload(payload)).toBe(false);
    });

    it('should reject payload with missing newPhase', () => {
      const payload = {};

      expect(isGamePhaseChangedPayload(payload)).toBe(false);
    });

    it('should reject null payload', () => {
      expect(isGamePhaseChangedPayload(null)).toBe(false);
    });

    it('should reject undefined payload', () => {
      expect(isGamePhaseChangedPayload(undefined)).toBe(false);
    });

    it('should reject non-object payload', () => {
      expect(isGamePhaseChangedPayload('not-an-object')).toBe(false);
    });
  });
});
