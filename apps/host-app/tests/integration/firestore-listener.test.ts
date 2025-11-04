/**
 * Integration tests for Firestore real-time listener
 * Tests real connection to Firebase emulator
 */

/* eslint-disable no-async-promise-executor */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { GameState } from '@allstars/types';

describe('Firestore Real-Time Listener Integration', () => {
  const TEST_SESSION_ID = 'test-session-' + Date.now();
  const TEST_COLLECTION = 'game-sessions';

  beforeAll(() => {
    // Verify emulator is running
    if (import.meta.env.VITE_USE_EMULATOR !== 'true') {
      throw new Error('Tests must run with Firebase emulator');
    }
  });

  afterAll(async () => {
    // Clean up test documents
    try {
      await deleteDoc(doc(firestore, TEST_COLLECTION, TEST_SESSION_ID));
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    try {
      await deleteDoc(doc(firestore, TEST_COLLECTION, TEST_SESSION_ID));
    } catch {
      // Document might not exist
    }
  });

  it('should connect to Firestore emulator', () => {
    expect(firestore).toBeDefined();
  });

  it('should listen to real-time document updates', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const sessionRef = doc(firestore, TEST_COLLECTION, TEST_SESSION_ID);

      const initialState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: Timestamp.now(),
      };

      let updateCount = 0;
      let receivedState: GameState | null = null;

      const unsubscribe = onSnapshot(
        sessionRef,
        (snapshot) => {
          updateCount++;

          if (snapshot.exists()) {
            receivedState = snapshot.data() as GameState;

            if (updateCount === 1) {
              // First update - verify initial state
              expect(receivedState.currentPhase).toBe('ready_for_next');
            } else if (updateCount === 2) {
              // Second update - verify changed state
              expect(receivedState.currentPhase).toBe('accepting_answers');
              unsubscribe();
              resolve();
            }
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      // Create initial document
      await setDoc(sessionRef, initialState);

      // Wait a bit, then update
      setTimeout(async () => {
        await setDoc(sessionRef, {
          ...initialState,
          currentPhase: 'accepting_answers',
          lastUpdate: Timestamp.now(),
        });
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  });

  it('should handle document deletion', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const sessionRef = doc(firestore, TEST_COLLECTION, TEST_SESSION_ID);

      const initialState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        lastUpdate: Timestamp.now(),
      };

      let snapshotCount = 0;

      const unsubscribe = onSnapshot(
        sessionRef,
        (snapshot) => {
          snapshotCount++;

          if (snapshotCount === 1) {
            expect(snapshot.exists()).toBe(true);
          } else if (snapshotCount === 2) {
            expect(snapshot.exists()).toBe(false);
            unsubscribe();
            resolve();
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      // Create document
      await setDoc(sessionRef, initialState);

      // Delete after short delay
      setTimeout(async () => {
        await deleteDoc(sessionRef);
      }, 100);

      // Timeout
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  });

  it('should receive updates for nested field changes', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const sessionRef = doc(firestore, TEST_COLLECTION, TEST_SESSION_ID);

      const initialState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        participantCount: 10,
        lastUpdate: Timestamp.now(),
      };

      let updateCount = 0;

      const unsubscribe = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            updateCount++;
            const data = snapshot.data() as GameState;

            if (updateCount === 1) {
              expect(data.participantCount).toBe(10);
            } else if (updateCount === 2) {
              expect(data.participantCount).toBe(15);
              unsubscribe();
              resolve();
            }
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      await setDoc(sessionRef, initialState);

      setTimeout(async () => {
        await setDoc(sessionRef, {
          ...initialState,
          participantCount: 15,
          lastUpdate: Timestamp.now(),
        });
      }, 100);

      setTimeout(() => {
        unsubscribe();
        reject(new Error('Test timeout'));
      }, 5000);
    });
  });

  it('should handle rapid successive updates', async () => {
    return new Promise<void>(async (resolve, reject) => {
      const sessionRef = doc(firestore, TEST_COLLECTION, TEST_SESSION_ID);

      const initialState: GameState = {
        currentPhase: 'ready_for_next',
        currentQuestion: null,
        isGongActive: false,
        participantCount: 0,
        lastUpdate: Timestamp.now(),
      };

      let finalCount = 0;

      const unsubscribe = onSnapshot(
        sessionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as GameState;
            finalCount = data.participantCount || 0;

            // Wait for final value
            if (finalCount === 5) {
              unsubscribe();
              resolve();
            }
          }
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );

      // Create initial document
      await setDoc(sessionRef, initialState);

      // Send rapid updates
      for (let i = 1; i <= 5; i++) {
        await setDoc(sessionRef, {
          ...initialState,
          participantCount: i,
          lastUpdate: Timestamp.now(),
        });
      }

      setTimeout(() => {
        unsubscribe();
        if (finalCount !== 5) {
          reject(new Error(`Expected final count 5, got ${finalCount}`));
        }
      }, 2000);
    });
  });

  it('should handle listener errors gracefully', async () => {
    return new Promise<void>((resolve, reject) => {
      // Use an invalid document path to trigger error
      const invalidRef = doc(firestore, '', ''); // Invalid path

      const unsubscribe = onSnapshot(
        invalidRef,
        () => {
          unsubscribe();
          reject(new Error('Should not receive successful snapshot'));
        },
        (error) => {
          expect(error).toBeDefined();
          unsubscribe();
          resolve();
        }
      );

      setTimeout(() => {
        unsubscribe();
        reject(new Error('Error handler not called'));
      }, 2000);
    });
  });
});
