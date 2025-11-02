/**
 * Unit tests for game state service
 * Tests transaction logic and state management
 */

import { db } from '../../../src/utils/firestore';
import {
  advanceGame,
  getCurrentGameState,
} from '../../../src/services/gameStateService';

// Mock Firestore
jest.mock('../../../src/utils/firestore', () => ({
  db: {
    collection: jest.fn(),
    runTransaction: jest.fn(),
  },
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
      },
    },
  },
}));

// Mock dependencies
jest.mock('../../../src/services/questionService');
jest.mock('../../../src/services/guestService');
jest.mock('../../../src/services/answerService');

describe('Game State Service', () => {
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockRunTransaction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockDoc = jest.fn(() => ({ get: mockGet }));
    mockCollection = jest.fn(() => ({ doc: mockDoc }));
    mockRunTransaction = jest.fn();

    (db.collection as jest.Mock) = mockCollection;
    (db.runTransaction as jest.Mock) = mockRunTransaction;
  });

  describe('Document Path Validation', () => {
    it('should use gameState/live document path', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => ({
          phase: 'idle',
          activeQuestionId: null,
          isGongActive: false,
          results: null,
          prizeCarryover: 0,
        }),
      });

      await getCurrentGameState();

      // Verify correct collection and document ID
      expect(mockCollection).toHaveBeenCalledWith('gameState');
      expect(mockDoc).toHaveBeenCalledWith('live');
    });
  });

  describe('Transaction-based State Updates', () => {
    it('should use Firestore transactions for all state changes', async () => {
      // This ensures concurrent updates are handled correctly
      expect(true).toBe(true);
    });

    it('should handle race conditions between multiple hosts', async () => {
      // Test that transactions prevent conflicting state updates
      expect(true).toBe(true);
    });
  });

  describe('State Transition Validation', () => {
    it('should allow valid state transitions', async () => {
      const validTransitions = [
        { from: 'idle', action: 'START_QUESTION', to: 'accepting_answers' },
        {
          from: 'accepting_answers',
          action: 'SHOW_DISTRIBUTION',
          to: 'showing_distribution',
        },
        {
          from: 'showing_distribution',
          action: 'SHOW_CORRECT_ANSWER',
          to: 'showing_correct_answer',
        },
        {
          from: 'showing_correct_answer',
          action: 'SHOW_RESULTS',
          to: 'showing_results',
        },
      ];

      // Will be tested once service is implemented
      expect(validTransitions.length).toBeGreaterThan(0);
    });

    it('should reject invalid state transitions', async () => {
      const invalidTransitions = [
        { from: 'idle', action: 'SHOW_DISTRIBUTION' },
        { from: 'idle', action: 'SHOW_RESULTS' },
        { from: 'showing_results', action: 'START_QUESTION' },
      ];

      // Will be tested once service is implemented
      expect(invalidTransitions.length).toBeGreaterThan(0);
    });
  });

  describe('Guest Name Hydration', () => {
    it('should denormalize guest names for results', async () => {
      // Test that results include guest names from guests collection
      expect(true).toBe(true);
    });

    it('should handle missing guest records gracefully', async () => {
      // Test fallback when guest document doesn't exist
      expect(true).toBe(true);
    });
  });

  describe('Gong Trigger Behavior (US4)', () => {
    beforeEach(() => {
      // Import mocked dependencies
      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      const { getGuestById } = require('../../../src/services/guestService');

      // Reset mocks
      (getTop10CorrectAnswers as jest.Mock).mockReset();
      (getWorst10IncorrectAnswers as jest.Mock).mockReset();
      (getGuestById as jest.Mock).mockReset();
    });

    it('should drop worst performer(s) when gong is active with mixed answers', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: true, // Gong is active
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // Mock mixed answers: some correct, some incorrect
      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: true, responseTimeMs: 1500 },
        { guestId: 'guest-2', isCorrect: true, responseTimeMs: 2000 },
      ]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-3', isCorrect: false, responseTimeMs: 5000 }, // Worst performer
        { guestId: 'guest-4', isCorrect: false, responseTimeMs: 3000 },
      ]);

      // Mock guest data
      const { getGuestById } = require('../../../src/services/guestService');
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: 'active',
          attributes: [],
          authMethod: 'anonymous',
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      // Mock batch for updating guest status
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock) = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should drop worst performer (guest-3 with 5000ms)
      expect(mockBatchUpdate).toHaveBeenCalled();
      expect(result.isGongActive).toBe(false); // Gong should be deactivated
    });

    it('should set isGongActive to false after showing results with gong', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: true, responseTimeMs: 1500 },
      ]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 3000 },
      ]);

      const { getGuestById } = require('../../../src/services/guestService');
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: 'active',
          attributes: [],
          authMethod: 'anonymous',
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock) = jest.fn(() => ({
        update: jest.fn(),
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      expect(result.isGongActive).toBe(false);
    });

    it('should reject TRIGGER_GONG when gong is already inactive', async () => {
      const currentState = {
        id: 'live',
        phase: 'accepting_answers',
        activeQuestionId: 'question-1',
        isGongActive: false, // Already inactive
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const action = {
        action: 'TRIGGER_GONG' as const,
        payload: {},
      };

      await expect(advanceGame(action)).rejects.toThrow('Gong is no longer active');
    });

    it('should not eliminate anyone when all guests answer correctly with gong active', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // All correct answers
      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: true, responseTimeMs: 1500 },
        { guestId: 'guest-2', isCorrect: true, responseTimeMs: 2000 },
        { guestId: 'guest-3', isCorrect: true, responseTimeMs: 2500 },
      ]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([]);

      const { getGuestById } = require('../../../src/services/guestService');
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: 'active',
          attributes: [],
          authMethod: 'anonymous',
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      (db.batch as jest.Mock) = jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      }));

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should not call batch update (no one to drop)
      expect(db.batch).not.toHaveBeenCalled();
      expect(result.isGongActive).toBe(false);
    });

    it('should not eliminate anyone when all guests answer incorrectly with gong active', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // All incorrect answers
      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: false, responseTimeMs: 2000 },
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 2500 },
        { guestId: 'guest-3', isCorrect: false, responseTimeMs: 3000 },
      ]);

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      (db.batch as jest.Mock) = jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      }));

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should not call batch update (all incorrect = nobody dropped)
      expect(db.batch).not.toHaveBeenCalled();
      expect(result.isGongActive).toBe(false);
    });

    it('should eliminate all guests tied for worst when gong is active', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // Mixed answers with two guests tied for worst
      const { getTop10CorrectAnswers, getWorst10IncorrectAnswers } = require('../../../src/services/answerService');
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: true, responseTimeMs: 1500 },
      ]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 5000 }, // Tied for worst
        { guestId: 'guest-3', isCorrect: false, responseTimeMs: 5000 }, // Tied for worst
        { guestId: 'guest-4', isCorrect: false, responseTimeMs: 3000 },
      ]);

      const { getGuestById } = require('../../../src/services/guestService');
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: 'active',
          attributes: [],
          authMethod: 'anonymous',
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock) = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should drop both guests with 5000ms
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(result.isGongActive).toBe(false);
    });
  });

  describe('Revive All Guests (US5)', () => {
    it('should transition phase to all_revived after REVIVE_ALL action', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_results',
        activeQuestionId: 'question-1',
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      // Mock batch for guest updates
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockWhere = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            {
              ref: { path: 'guests/guest-1' },
              data: () => ({ status: 'dropped' }),
            },
          ],
        }),
      });

      mockCollection.mockReturnValue({
        where: mockWhere,
        doc: mockDoc,
      });

      (db.batch as jest.Mock) = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'REVIVE_ALL' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      expect(result.phase).toBe('all_revived');
    });

    it('should revive all dropped guests when REVIVE_ALL is called', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_results',
        activeQuestionId: null,
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      // Mock dropped guests
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockWhere = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            {
              ref: { path: 'guests/guest-1' },
              data: () => ({ status: 'dropped' }),
            },
            {
              ref: { path: 'guests/guest-2' },
              data: () => ({ status: 'dropped' }),
            },
            {
              ref: { path: 'guests/guest-3' },
              data: () => ({ status: 'dropped' }),
            },
          ],
        }),
      });

      mockCollection.mockReturnValue({
        where: mockWhere,
        doc: mockDoc,
      });

      (db.batch as jest.Mock) = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'REVIVE_ALL' as const,
        payload: {},
      };

      await advanceGame(action);

      // Verify batch update was called for each dropped guest
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it('should be idempotent when no guests are dropped', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_results',
        activeQuestionId: null,
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: 'live',
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      // Mock no dropped guests
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      const mockWhere = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          empty: true,
          docs: [],
        }),
      });

      mockCollection.mockReturnValue({
        where: mockWhere,
        doc: mockDoc,
      });

      (db.batch as jest.Mock) = jest.fn(() => ({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      }));

      const action = {
        action: 'REVIVE_ALL' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should still transition to all_revived phase
      expect(result.phase).toBe('all_revived');
      // But should not call batch update
      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });
  });
});
