import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DocumentReference, DocumentSnapshot } from 'firebase/firestore';
import type { GameState } from '@allstars/types';

// Mock Firebase Firestore
const mockDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetFirestore = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getFirestore: () => mockGetFirestore(),
}));

vi.mock('@/lib/firebase', () => ({
  getFirestoreInstance: () => mockGetFirestore(),
}));

describe('firestoreService', () => {
  let mockDb: any;
  let mockDocRef: Partial<DocumentReference>;
  let mockDocSnap: Partial<DocumentSnapshot>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Firestore database
    mockDb = {
      type: 'firestore',
      app: { name: 'test-app' },
    };

    mockGetFirestore.mockReturnValue(mockDb);

    // Create mock document reference
    mockDocRef = {
      id: 'live',
      path: 'gameState/live',
      type: 'document',
    } as Partial<DocumentReference>;

    mockDoc.mockReturnValue(mockDocRef);

    // Create mock document snapshot
    mockDocSnap = {
      exists: () => true,
      data: () => ({
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0,
          toDate: () => new Date(),
          toMillis: () => Date.now(),
        },
      } as GameState),
      id: 'live',
      ref: mockDocRef as DocumentReference,
    } as Partial<DocumentSnapshot>;

    mockGetDoc.mockResolvedValue(mockDocSnap);
  });

  /**
   * T029: Test Firestore service initialization
   * Verify getGameStateRef() returns DocumentReference for gameState/live
   */
  it('should return DocumentReference for gameState/live', async () => {
    // Import after mocks are set up
    const { getGameStateRef } = await import(
      '../../../src/services/firestoreService'
    );

    const docRef = getGameStateRef();

    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'gameState', 'live');
    expect(docRef).toBe(mockDocRef);
    expect(docRef.path).toBe('gameState/live');
  });

  /**
   * T030: Test successful read operation
   * Mock authenticated user, call readGameState(), verify getDoc() called
   */
  it('should read gameState document successfully', async () => {
    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    const result = await readGameState();

    expect(mockGetDoc).toHaveBeenCalledWith(mockDocRef);
    expect(result.currentPhase).toBe('ready_for_next');
    expect(result.currentQuestion).toBeNull();
    expect(result.isGongActive).toBe(false);
    expect(result.lastUpdate).toBeDefined();
  });

  /**
   * T031: Test read when document doesn't exist
   * Verify appropriate error when gameState/live document is missing
   */
  it('should throw error when gameState document does not exist', async () => {
    // Mock document not existing
    const emptyDocSnap = {
      exists: () => false,
      data: () => undefined,
      id: 'live',
    } as Partial<DocumentSnapshot>;

    mockGetDoc.mockResolvedValue(emptyDocSnap);

    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    await expect(readGameState()).rejects.toThrow(
      'gameState/live document does not exist'
    );
  });

  /**
   * T032: Test Firestore read error handling
   * Mock getDoc() to throw permission error, verify error caught and returned
   */
  it('should handle Firestore permission errors gracefully', async () => {
    const permissionError = new Error('Permission denied');
    (permissionError as any).code = 'permission-denied';

    mockGetDoc.mockRejectedValue(permissionError);

    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    await expect(readGameState()).rejects.toThrow('Permission denied');
  });

  /**
   * Additional test: Network error handling
   */
  it('should handle network errors during read', async () => {
    const networkError = new Error('Network request failed');
    (networkError as any).code = 'unavailable';

    mockGetDoc.mockRejectedValue(networkError);

    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    await expect(readGameState()).rejects.toThrow('Network request failed');
  });

  /**
   * Additional test: Verify returned data structure matches GameState type
   */
  it('should return data matching GameState type structure', async () => {
    const fullGameState: GameState = {
      currentPhase: 'showing_correct_answer',
      currentQuestion: {
        questionId: 'q1',
        questionText: 'Test question?',
        questionNumber: 1,
        choices: [
          { index: 0, text: 'Choice A' },
          { index: 1, text: 'Choice B' },
        ],
        correctAnswer: 'A',
        period: 'first-half',
      },
      isGongActive: false,
      lastUpdate: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(),
        toMillis: () => Date.now(),
      },
      participantCount: 10,
    };

    mockDocSnap.data = () => fullGameState;

    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    const result = await readGameState();

    expect(result).toEqual(fullGameState);
    expect(result.currentPhase).toBe('showing_correct_answer');
    expect(result.currentQuestion).toBeDefined();
    expect(result.participantCount).toBe(10);
  });

  /**
   * Additional test: Verify caching behavior (if implemented)
   */
  it('should call getDoc each time readGameState is called', async () => {
    const { readGameState } = await import(
      '../../../src/services/firestoreService'
    );

    await readGameState();
    await readGameState();
    await readGameState();

    // Should call getDoc 3 times (no caching for real-time data)
    expect(mockGetDoc).toHaveBeenCalledTimes(3);
  });
});
