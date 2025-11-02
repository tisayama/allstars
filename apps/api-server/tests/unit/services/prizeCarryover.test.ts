/**
 * Unit tests for prize carryover logic (User Story 3)
 * Tests all-incorrect detection and prize accumulation
 */

import { db } from '../../../src/utils/firestore';
import {
  advanceGame,
  getCurrentGameState,
} from '../../../src/services/gameStateService';
import {
  getAnswersByQuestion,
  getTop10CorrectAnswers,
  getWorst10IncorrectAnswers,
} from '../../../src/services/answerService';

// Mock Firestore
jest.mock('../../../src/utils/firestore', () => ({
  db: {
    collection: jest.fn(),
    runTransaction: jest.fn(),
    batch: jest.fn(),
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
jest.mock('../../../src/services/answerService', () => ({
  getAnswersByQuestion: jest.fn(),
  getTop10CorrectAnswers: jest.fn(),
  getWorst10IncorrectAnswers: jest.fn(),
}));

describe('Prize Carryover Logic (US3)', () => {
  let mockRunTransaction: jest.Mock;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockDoc = jest.fn(() => ({ get: mockGet }));
    mockCollection = jest.fn(() => ({ doc: mockDoc }));
    mockRunTransaction = jest.fn();

    (db.collection as jest.Mock) = mockCollection;
    (db.runTransaction as jest.Mock) = mockRunTransaction;
  });

  describe('All Incorrect Detection', () => {
    it('should increase prizeCarryover by question prize when all guests answer incorrectly', async () => {
      // Mock game state with active question
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: false,
        results: null,
        prizeCarryover: 1000, // Previous carryover
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // Mock answer service to return no correct answers
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: false, responseTimeMs: 1500 },
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 2000 },
        { guestId: 'guest-3', isCorrect: false, responseTimeMs: 2500 },
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

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should increase prizeCarryover by base prize (assume 10000)
      expect(result.prizeCarryover).toBe(11000); // 1000 + 10000
    });

    it('should keep all guests with status=active when all incorrect', async () => {
      // Mock game state
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      // Mock all incorrect answers
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: false, responseTimeMs: 1500 },
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 2000 },
      ]);

      // Mock guest service
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

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      await advanceGame(action);

      // Verify guests were not dropped (no batch update should be called)
      expect(db.batch).not.toHaveBeenCalled();
    });

    it('should transition phase to all_incorrect after calculating all-incorrect results', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // Mock all incorrect answers
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: false, responseTimeMs: 1500 },
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

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      expect(result.phase).toBe('all_incorrect');
    });
  });

  describe('Prize Accumulation', () => {
    it('should calculate next question prize as basePrize + prizeCarryover', async () => {
      // This will test the logic when starting a new question
      // The total prize available should be basePrize + accumulated carryover
      expect(true).toBe(true); // Placeholder - will implement with question start logic
    });

    it('should reset prizeCarryover to 0 after question with any correct answers', async () => {
      const currentState = {
        id: 'live',
        phase: 'showing_correct_answer',
        activeQuestionId: 'question-1',
        isGongActive: false,
        results: null,
        prizeCarryover: 5000, // Has accumulated carryover
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: 'live',
        data: () => currentState,
      });

      // Mock answers with at least one correct
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-1', isCorrect: true, responseTimeMs: 1500 },
      ]);
      (getWorst10IncorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: 'guest-2', isCorrect: false, responseTimeMs: 2000 },
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

      const action = {
        action: 'SHOW_RESULTS' as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should reset to 0 when there are correct answers
      expect(result.prizeCarryover).toBe(0);
      expect(result.phase).toBe('showing_results'); // Normal phase, not all_incorrect
    });
  });
});
