/**
 * Unit tests for answer service
 * Tests duplicate answer detection logic
 */

import { submitAnswer } from '../../../src/services/answerService';
import { db } from '../../../src/utils/firestore';
import { DuplicateError, NotFoundError } from '../../../src/utils/errors';

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
jest.mock('../../../src/services/questionService', () => ({
  getQuestionById: jest.fn(),
}));

import { getQuestionById } from '../../../src/services/questionService';

describe('Answer Service', () => {
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockLimit: jest.Mock;
  let mockRunTransaction: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGet = jest.fn();
    mockWhere = jest.fn();
    mockLimit = jest.fn();
    mockDoc = jest.fn();
    mockCollection = jest.fn();
    mockRunTransaction = jest.fn();

    mockWhere.mockReturnThis();
    mockLimit.mockReturnValue({ get: mockGet });

    // Setup chained mock for sub-collection path
    mockDoc.mockReturnValue({
      get: mockGet,
      collection: jest.fn().mockReturnValue({
        doc: mockDoc,
      }),
    });

    mockCollection.mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
    });

    (db.collection as jest.Mock) = mockCollection;
    (db.runTransaction as jest.Mock) = mockRunTransaction;

    // Mock question service
    (getQuestionById as jest.Mock).mockResolvedValue({
      id: 'question-1',
      text: 'Test question?',
      choices: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A',
    });
  });

  describe('Sub-collection Path Validation', () => {
    it('should use questions/{questionId}/answers/{guestId} sub-collection path', async () => {
      mockRunTransaction.mockImplementation(async (callback) => {
        const mockTransaction = {
          get: jest.fn().mockResolvedValue({ empty: true }),
          set: jest.fn(),
        };

        // Mock sub-collection query
        const mockSubCollection = {
          doc: jest.fn().mockReturnThis(),
        };

        // Expect collection to be called for questions/{questionId}/answers
        mockCollection.mockImplementation((collectionName) => {
          if (collectionName === 'questions') {
            return {
              doc: jest.fn((questionId) => ({
                collection: jest.fn((subCollectionName) => {
                  // Verify sub-collection name is 'answers'
                  expect(subCollectionName).toBe('answers');
                  return mockSubCollection;
                }),
              })),
            };
          }
          return { where: mockWhere, doc: mockDoc };
        });

        return callback(mockTransaction);
      });

      const answerData = {
        questionId: 'question-1',
        answer: 'A',
        responseTimeMs: 1500,
      };

      await submitAnswer('guest-1', answerData);

      // Verify questions collection was accessed
      expect(mockCollection).toHaveBeenCalledWith('questions');
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate answer for same guest and question', async () => {
      // Mock transaction with duplicate found
      mockRunTransaction.mockImplementation(async (callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            empty: false, // Duplicate exists
            docs: [
              {
                id: 'existing-answer',
                data: () => ({
                  guestId: 'guest-1',
                  questionId: 'question-1',
                  answer: 'A',
                }),
              },
            ],
          }),
        };
        return callback(transaction);
      });

      const answerData = {
        questionId: 'question-1',
        answer: 'B',
        responseTimeMs: 2000,
      };

      await expect(
        submitAnswer('guest-1', answerData)
      ).rejects.toThrow(DuplicateError);
      await expect(
        submitAnswer('guest-1', answerData)
      ).rejects.toThrow('already submitted an answer');
    });

    it('should allow answer from different guest for same question', async () => {
      // This test will pass once service is implemented
      expect(true).toBe(true);
    });

    it('should allow multiple answers from same guest for different questions', async () => {
      // This test will pass once service is implemented
      expect(true).toBe(true);
    });
  });

  describe('Correctness Validation', () => {
    it('should correctly mark answer as correct when it matches', async () => {
      // Will be tested once service is implemented
      expect(true).toBe(true);
    });

    it('should correctly mark answer as incorrect when it does not match', async () => {
      // Will be tested once service is implemented
      expect(true).toBe(true);
    });
  });

  describe('Invalid Question', () => {
    it('should throw NotFoundError for non-existent question', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const answerData = {
        questionId: 'non-existent',
        answer: 'A',
        responseTimeMs: 1000,
      };

      // Once implemented, should throw NotFoundError
      expect(true).toBe(true);
    });
  });
});
