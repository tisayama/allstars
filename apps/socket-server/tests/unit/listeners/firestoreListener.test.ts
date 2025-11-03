import { initializeFirestoreListener } from '../../../src/listeners/firestoreListener';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));

describe('Firestore Listener Initialization (T036)', () => {
  let mockOnSnapshot: jest.Mock;
  let mockDoc: jest.Mock;
  let mockCollection: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOnSnapshot = jest.fn();
    mockDoc = jest.fn().mockReturnValue({
      onSnapshot: mockOnSnapshot,
    });
    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
    });

    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
  });

  it('should initialize listener on gameState/live document', () => {
    const mockCallback = jest.fn();

    initializeFirestoreListener(mockCallback);

    expect(admin.firestore).toHaveBeenCalled();
    expect(mockCollection).toHaveBeenCalledWith('gameState');
    expect(mockDoc).toHaveBeenCalledWith('live');
    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it('should call callback when snapshot is received', () => {
    const mockCallback = jest.fn();
    let snapshotHandler: any;

    mockOnSnapshot.mockImplementation((handler: any) => {
      snapshotHandler = handler;
      return jest.fn(); // Return unsubscribe function
    });

    initializeFirestoreListener(mockCallback);

    // Simulate snapshot
    const mockSnapshot = {
      exists: true,
      data: () => ({
        currentPhase: 'accepting_answers',
        currentQuestionId: 'q001',
        isGongActive: false,
      }),
    };

    snapshotHandler(mockSnapshot);

    expect(mockCallback).toHaveBeenCalledWith({
      currentPhase: 'accepting_answers',
      currentQuestionId: 'q001',
      isGongActive: false,
    });
  });

  it('should return unsubscribe function', () => {
    const mockCallback = jest.fn();
    const mockUnsubscribe = jest.fn();

    mockOnSnapshot.mockReturnValue(mockUnsubscribe);

    const unsubscribe = initializeFirestoreListener(mockCallback);

    expect(typeof unsubscribe).toBe('function');
    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('should handle non-existent document', () => {
    const mockCallback = jest.fn();
    let snapshotHandler: any;

    mockOnSnapshot.mockImplementation((handler: any) => {
      snapshotHandler = handler;
      return jest.fn();
    });

    initializeFirestoreListener(mockCallback);

    // Simulate non-existent document
    const mockSnapshot = {
      exists: false,
      data: () => null,
    };

    snapshotHandler(mockSnapshot);

    expect(mockCallback).toHaveBeenCalledWith(null);
  });

  describe('Error handling (T074)', () => {
    it('should handle Firestore listener errors', () => {
      const mockCallback = jest.fn();
      let errorHandler: any;

      mockOnSnapshot.mockImplementation((successHandler: any, errHandler: any) => {
        errorHandler = errHandler;
        return jest.fn();
      });

      initializeFirestoreListener(mockCallback);

      // Simulate Firestore error
      const mockError = new Error('Firestore connection lost');
      errorHandler(mockError);

      // Callback should not be called on error
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should set listener status to error state on failure', () => {
      const mockCallback = jest.fn();
      let errorHandler: any;

      mockOnSnapshot.mockImplementation((successHandler: any, errHandler: any) => {
        errorHandler = errHandler;
        return jest.fn();
      });

      // Import metrics to spy on
      const { listenerStatusGauge } = require('../../../src/monitoring/metrics');
      const setSpy = jest.spyOn(listenerStatusGauge, 'set');

      initializeFirestoreListener(mockCallback);

      // Simulate error
      errorHandler(new Error('Connection failed'));

      // Verify status gauge was set to error state (2)
      expect(setSpy).toHaveBeenCalledWith(2);
    });

    it('should continue to allow unsubscribe after error', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      let errorHandler: any;

      mockOnSnapshot.mockImplementation((successHandler: any, errHandler: any) => {
        errorHandler = errHandler;
        return mockUnsubscribe;
      });

      const unsubscribe = initializeFirestoreListener(mockCallback);

      // Simulate error
      errorHandler(new Error('Connection error'));

      // Should still be able to unsubscribe
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
