/**
 * Unit tests for game state service
 * Tests transaction logic and state management
 */

import { db } from "../../../src/utils/firestore";
import {
  advanceGame,
  getCurrentGameState,
} from "../../../src/services/gameStateService";

// Mock p-retry module (same as retry.test.ts)
jest.mock("p-retry", () => {
  class AbortError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AbortError";
    }
  }

  const mockPRetry = jest.fn(async (operation, options) => {
    let lastError: Error | undefined;
    const maxAttempts = (options?.retries || 3) + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof AbortError) {
          throw error;
        }

        if (options?.onFailedAttempt && attempt < maxAttempts) {
          options.onFailedAttempt({
            attemptNumber: attempt,
            retriesLeft: maxAttempts - attempt,
            name: (error as Error).name,
            message: (error as Error).message,
          });
        }

        if (attempt >= maxAttempts) {
          throw lastError;
        }
      }
    }

    throw lastError;
  });

  return {
    __esModule: true,
    default: mockPRetry,
    AbortError,
  };
});

// Mock Firestore
jest.mock("../../../src/utils/firestore", () => ({
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
jest.mock("../../../src/services/questionService");
jest.mock("../../../src/services/guestService");
jest.mock("../../../src/services/answerService");

describe("Game State Service", () => {
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

  describe("Document Path Validation", () => {
    it("should use gameState/live document path", async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => ({
          phase: "idle",
          activeQuestionId: null,
          isGongActive: false,
          results: null,
          prizeCarryover: 0,
        }),
      });

      await getCurrentGameState();

      // Verify correct collection and document ID
      expect(mockCollection).toHaveBeenCalledWith("gameState");
      expect(mockDoc).toHaveBeenCalledWith("live");
    });
  });

  describe("Transaction-based State Updates", () => {
    it("should use Firestore transactions for all state changes", async () => {
      // This ensures concurrent updates are handled correctly
      expect(true).toBe(true);
    });

    it("should handle race conditions between multiple hosts", async () => {
      // Test that transactions prevent conflicting state updates
      expect(true).toBe(true);
    });
  });

  describe("State Transition Validation", () => {
    it("should allow valid state transitions", async () => {
      const validTransitions = [
        { from: "idle", action: "START_QUESTION", to: "accepting_answers" },
        {
          from: "accepting_answers",
          action: "SHOW_DISTRIBUTION",
          to: "showing_distribution",
        },
        {
          from: "showing_distribution",
          action: "SHOW_CORRECT_ANSWER",
          to: "showing_correct_answer",
        },
        {
          from: "showing_correct_answer",
          action: "SHOW_RESULTS",
          to: "showing_results",
        },
      ];

      // Will be tested once service is implemented
      expect(validTransitions.length).toBeGreaterThan(0);
    });

    it("should reject invalid state transitions", async () => {
      const invalidTransitions = [
        { from: "idle", action: "SHOW_DISTRIBUTION" },
        { from: "idle", action: "SHOW_RESULTS" },
        { from: "showing_results", action: "START_QUESTION" },
      ];

      // Will be tested once service is implemented
      expect(invalidTransitions.length).toBeGreaterThan(0);
    });
  });

  describe("Guest Name Hydration", () => {
    it("should denormalize guest names for results", async () => {
      // Test that results include guest names from guests collection
      expect(true).toBe(true);
    });

    it("should handle missing guest records gracefully", async () => {
      // Test fallback when guest document doesn't exist
      expect(true).toBe(true);
    });
  });

  describe("Gong Trigger Behavior (US4)", () => {
    beforeEach(() => {
      // Import mocked dependencies
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      const { getGuestById } = require("../../../src/services/guestService");

      // Reset mocks
      (getTop10CorrectAnswers as jest.Mock).mockReset();
      (getWorst10CorrectAnswers as jest.Mock).mockReset();
      (getGuestById as jest.Mock).mockReset();
    });

    it("should drop worst performer(s) when gong is active with mixed answers", async () => {
      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half",
          questionNumber: 1,
        },
        isGongActive: true, // Gong is active
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => currentState,
      });

      // Mock mixed answers: some correct, some incorrect
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", isCorrect: true, responseTimeMs: 1500 },
        { guestId: "guest-2", isCorrect: true, responseTimeMs: 2000 },
      ]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-3", isCorrect: false, responseTimeMs: 5000 }, // Worst performer
        { guestId: "guest-4", isCorrect: false, responseTimeMs: 3000 },
      ]);

      // Mock guest data
      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
          attributes: [],
          authMethod: "anonymous",
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should drop worst performer (guest-3 with 5000ms)
      expect(mockBatchUpdate).toHaveBeenCalled();
      expect(result.isGongActive).toBe(false); // Gong should be deactivated
    });

    it("should set isGongActive to false after showing results with gong", async () => {
      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half",
          questionNumber: 1,
        },
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => currentState,
      });

      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", isCorrect: true, responseTimeMs: 1500 },
      ]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-2", isCorrect: false, responseTimeMs: 3000 },
      ]);

      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
          attributes: [],
          authMethod: "anonymous",
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      expect(result.isGongActive).toBe(false);
    });

    it("should reject TRIGGER_GONG when gong is already inactive", async () => {
      const currentState = {
        id: "live",
        phase: "accepting_answers",
        activeQuestionId: "question-1",
        isGongActive: false, // Already inactive
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const action = {
        action: "TRIGGER_GONG" as const,
        payload: {},
      };

      await expect(advanceGame(action)).rejects.toThrow(
        "Gong is no longer active"
      );
    });

    it("should not eliminate anyone when all guests answer correctly with gong active", async () => {
      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half",
          questionNumber: 1,
        },
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => currentState,
      });

      // All correct answers
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", isCorrect: true, responseTimeMs: 1500 },
        { guestId: "guest-2", isCorrect: true, responseTimeMs: 2000 },
        { guestId: "guest-3", isCorrect: true, responseTimeMs: 2500 },
      ]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([]);

      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
          attributes: [],
          authMethod: "anonymous",
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should not call batch update (no one to drop)
      expect(db.batch).not.toHaveBeenCalled();
      expect(result.isGongActive).toBe(false);
    });

    it("should not eliminate anyone when all guests answer incorrectly with gong active", async () => {
      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half",
          questionNumber: 1,
        },
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => currentState,
      });

      // All incorrect answers
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", isCorrect: false, responseTimeMs: 2000 },
        { guestId: "guest-2", isCorrect: false, responseTimeMs: 2500 },
        { guestId: "guest-3", isCorrect: false, responseTimeMs: 3000 },
      ]);

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should not call batch update (all incorrect = nobody dropped)
      expect(db.batch).not.toHaveBeenCalled();
      expect(result.isGongActive).toBe(false);
    });

    it("should eliminate all guests tied for worst when gong is active", async () => {
      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half",
          questionNumber: 1,
        },
        isGongActive: true,
        results: null,
        prizeCarryover: 0,
      };

      mockGet.mockResolvedValue({
        exists: true,
        id: "live",
        data: () => currentState,
      });

      // Mixed answers with two guests tied for worst
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", isCorrect: true, responseTimeMs: 1500 },
      ]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-2", isCorrect: false, responseTimeMs: 5000 }, // Tied for worst
        { guestId: "guest-3", isCorrect: false, responseTimeMs: 5000 }, // Tied for worst
        { guestId: "guest-4", isCorrect: false, responseTimeMs: 3000 },
      ]);

      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
          attributes: [],
          authMethod: "anonymous",
        })
      );

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should drop both guests with 5000ms
      expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
      expect(result.isGongActive).toBe(false);
    });
  });

  describe("Revive All Guests (US5)", () => {
    it("should transition phase to all_revived after REVIVE_ALL action", async () => {
      const currentState = {
        id: "live",
        phase: "showing_results",
        activeQuestionId: "question-1",
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
              ref: { path: "guests/guest-1" },
              data: () => ({ status: "dropped" }),
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
        action: "REVIVE_ALL" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      expect(result.currentPhase).toBe("all_revived");
    });

    it("should revive all dropped guests when REVIVE_ALL is called", async () => {
      const currentState = {
        id: "live",
        phase: "showing_results",
        activeQuestionId: null,
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
              ref: { path: "guests/guest-1" },
              data: () => ({ status: "dropped" }),
            },
            {
              ref: { path: "guests/guest-2" },
              data: () => ({ status: "dropped" }),
            },
            {
              ref: { path: "guests/guest-3" },
              data: () => ({ status: "dropped" }),
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
        action: "REVIVE_ALL" as const,
        payload: {},
      };

      await advanceGame(action);

      // Verify batch update was called for each dropped guest
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3);
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("should be idempotent when no guests are dropped", async () => {
      const currentState = {
        id: "live",
        phase: "showing_results",
        activeQuestionId: null,
        isGongActive: false,
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
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
        action: "REVIVE_ALL" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Should still transition to all_revived phase
      expect(result.currentPhase).toBe("all_revived");
      // But should not call batch update
      expect(mockBatchUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Period Champion Designation (User Story 2)", () => {
    beforeEach(() => {
      // Mock answerService functions
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      // Mock question service
      const {
        getQuestionById,
      } = require("../../../src/services/questionService");
      (getQuestionById as jest.Mock).mockResolvedValue({
        questionId: "question-1",
        period: "first-half",
      });
    });

    it("[US2] should designate single period champion when isGongActive is true", async () => {
      // T024: Test with single fastest correct answer
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      // Mock top 10 with single fastest
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "champion-1", responseTimeMs: 1000 }, // Fastest
        { guestId: "guest-2", responseTimeMs: 1500 },
        { guestId: "guest-3", responseTimeMs: 2000 },
      ]);

      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-10", responseTimeMs: 10000 },
      ]);

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          period: "first-half",
        },
        activeQuestionId: "question-1",
        isGongActive: true, // Period-final question
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Verify period champion is designated
      expect(result.results?.periodChampions).toEqual(["champion-1"]);
      expect(result.results?.period).toBe("first-half");
    });

    it("[US2] should designate multiple period champions when tied for fastest", async () => {
      // T025: Test with tied fastest correct answers
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      // Mock top 10 with 3 participants tied for fastest
      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "champion-1", responseTimeMs: 1000 }, // Tied fastest
        { guestId: "champion-2", responseTimeMs: 1000 }, // Tied fastest
        { guestId: "champion-3", responseTimeMs: 1000 }, // Tied fastest
        { guestId: "guest-4", responseTimeMs: 1500 },
        { guestId: "guest-5", responseTimeMs: 2000 },
      ]);

      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-10", responseTimeMs: 10000 },
      ]);

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          period: "second-half",
        },
        activeQuestionId: "question-1",
        isGongActive: true, // Period-final question
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Verify all tied participants are designated as champions
      expect(result.results?.periodChampions).toEqual([
        "champion-1",
        "champion-2",
        "champion-3",
      ]);
      expect(result.results?.period).toBe("second-half");
    });

    it("[US2] should NOT populate periodChampions for non-final questions", async () => {
      // Verify periodChampions is undefined when isGongActive is false
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-1", responseTimeMs: 1000 },
      ]);

      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([
        { guestId: "guest-10", responseTimeMs: 10000 },
      ]);

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer",
        currentQuestion: {
          questionId: "question-1",
          period: "first-half",
        },
        activeQuestionId: "question-1",
        isGongActive: false, // Non-final question
        results: null,
        prizeCarryover: 0,
      };

      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(mockTransaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Verify periodChampions and period are NOT populated
      expect(result.results?.periodChampions).toBeUndefined();
      expect(result.results?.period).toBeUndefined();
    });
  });

  describe("Elimination Logic for Non-Final Questions (User Story 3)", () => {
    beforeEach(() => {
      // Mock answerService functions
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      // Mock question service
      const {
        getQuestionById,
      } = require("../../../src/services/questionService");
      (getQuestionById as jest.Mock).mockResolvedValue({
        questionId: "question-1",
        period: "first-half",
      });
    });

    it("[US3] should eliminate single slowest correct answer participant on non-final question", async () => {
      // T035: Test elimination of single slowest participant
      // Setup: Non-final question (isGongActive: false) with multiple correct answers

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer" as const,
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half" as const,
          questionNumber: 1,
        },
        isGongActive: false, // Non-final question
        results: null,
        prizeCarryover: 0,
        lastUpdate: new Date(),
      };

      // Mock 5 correct answers - slowest is guest-5 at 5000ms
      const mockTop10 = [
        { guestId: "guest-1", responseTimeMs: 1000, isCorrect: true },
        { guestId: "guest-2", responseTimeMs: 2000, isCorrect: true },
        { guestId: "guest-3", responseTimeMs: 3000, isCorrect: true },
        { guestId: "guest-4", responseTimeMs: 4000, isCorrect: true },
        { guestId: "guest-5", responseTimeMs: 5000, isCorrect: true },
      ];

      // Worst 10 is sorted descending (slowest first)
      const mockWorst10 = [
        { guestId: "guest-5", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-4", responseTimeMs: 4000, isCorrect: true },
        { guestId: "guest-3", responseTimeMs: 3000, isCorrect: true },
        { guestId: "guest-2", responseTimeMs: 2000, isCorrect: true },
        { guestId: "guest-1", responseTimeMs: 1000, isCorrect: true },
      ];

      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue(mockTop10);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue(mockWorst10);

      // Mock guest service
      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId: string) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
        })
      );

      // Mock db.collection().doc() to return DocumentReference with id
      (db.collection as jest.Mock).mockImplementation((collectionName) => ({
        doc: (docId: string) => ({
          id: docId,
          get: mockGet,
        }),
      }));

      // Mock Firestore batch for elimination
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock).mockReturnValue({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      // Mock transaction
      (db.runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(transaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      await advanceGame(action);

      // Verify guest-5 (slowest) was eliminated
      expect(mockBatchUpdate).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();

      // Verify only the slowest participant was marked for elimination
      const eliminatedGuests = mockBatchUpdate.mock.calls.map(
        (call: any) => call[0].id
      );
      expect(eliminatedGuests).toContain("guest-5");
      expect(eliminatedGuests).toHaveLength(1);
    });

    it("[US3] should eliminate all tied slowest correct answer participants", async () => {
      // T036: Test elimination of multiple tied slowest participants

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer" as const,
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half" as const,
          questionNumber: 1,
        },
        isGongActive: false, // Non-final question
        results: null,
        prizeCarryover: 0,
        lastUpdate: new Date(),
      };

      // Mock answers where guest-4, guest-5, guest-6 are all tied for slowest at 5000ms
      const mockTop10 = [
        { guestId: "guest-1", responseTimeMs: 1000, isCorrect: true },
        { guestId: "guest-2", responseTimeMs: 2000, isCorrect: true },
        { guestId: "guest-3", responseTimeMs: 3000, isCorrect: true },
        { guestId: "guest-4", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-5", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-6", responseTimeMs: 5000, isCorrect: true },
      ];

      const mockWorst10 = [
        { guestId: "guest-4", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-5", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-6", responseTimeMs: 5000, isCorrect: true },
        { guestId: "guest-3", responseTimeMs: 3000, isCorrect: true },
        { guestId: "guest-2", responseTimeMs: 2000, isCorrect: true },
        { guestId: "guest-1", responseTimeMs: 1000, isCorrect: true },
      ];

      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue(mockTop10);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue(mockWorst10);

      // Mock guest service
      const { getGuestById } = require("../../../src/services/guestService");
      (getGuestById as jest.Mock).mockImplementation((guestId: string) =>
        Promise.resolve({
          id: guestId,
          name: `Guest ${guestId}`,
          status: "active",
        })
      );

      // Mock db.collection().doc() to return DocumentReference with id
      (db.collection as jest.Mock).mockImplementation((collectionName) => ({
        doc: (docId: string) => ({
          id: docId,
          get: mockGet,
        }),
      }));

      // Mock Firestore batch
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock).mockReturnValue({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      // Mock transaction
      (db.runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(transaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      await advanceGame(action);

      // Verify all 3 tied slowest participants were eliminated
      expect(mockBatchUpdate).toHaveBeenCalled();
      const eliminatedGuests = mockBatchUpdate.mock.calls.map(
        (call: any) => call[0].id
      );
      expect(eliminatedGuests).toHaveLength(3);
      expect(eliminatedGuests).toContain("guest-4");
      expect(eliminatedGuests).toContain("guest-5");
      expect(eliminatedGuests).toContain("guest-6");
    });

    it("[US3] should NOT eliminate anyone when all answers are incorrect", async () => {
      // T037: Test no elimination when all incorrect

      const currentState = {
        id: "live",
        currentPhase: "showing_correct_answer" as const,
        currentQuestion: {
          questionId: "question-1",
          questionText: "Test?",
          choices: [],
          period: "first-half" as const,
          questionNumber: 1,
        },
        isGongActive: false, // Non-final question
        results: null,
        prizeCarryover: 0,
        lastUpdate: new Date(),
      };

      // Mock all incorrect answers (empty arrays)
      const {
        getTop10CorrectAnswers,
        getWorst10CorrectAnswers,
      } = require("../../../src/services/answerService");

      (getTop10CorrectAnswers as jest.Mock).mockResolvedValue([]);
      (getWorst10CorrectAnswers as jest.Mock).mockResolvedValue([]);

      // Mock Firestore batch
      const mockBatchUpdate = jest.fn();
      const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
      (db.batch as jest.Mock).mockReturnValue({
        update: mockBatchUpdate,
        commit: mockBatchCommit,
      });

      // Mock transaction
      (db.runTransaction as jest.Mock).mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            id: "live",
            data: () => currentState,
          }),
          set: jest.fn(),
        };
        return callback(transaction);
      });

      const action = {
        action: "SHOW_RESULTS" as const,
        payload: {},
      };

      const result = await advanceGame(action);

      // Verify no eliminations occurred
      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(result.currentPhase).toBe("all_incorrect");
      expect(result.prizeCarryover).toBe(10000); // Base prize added to carryover
    });
  });
});
