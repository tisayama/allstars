import type { Firestore } from 'firebase-admin/firestore';
import type { GameState, Question, Guest } from '@allstars/types';

/**
 * Helper class for seeding test data into Firestore Emulator
 *
 * Provides type-safe methods for populating Firestore with test data
 * and cleaning up after tests complete.
 */
export class FirestoreSeeder {
  constructor(private db: Firestore) {}

  /**
   * Seed game state document with provided data
   * Merges provided state with default values
   */
  async seedGameState(state: Partial<GameState>): Promise<void> {
    const defaultState: GameState = {
      currentPhase: 'waiting',
      isActive: false,
      currentQuestionId: null,
      currentPeriod: 1,
      currentRound: null,
      timeRemaining: null,
      gongActivatedAt: null,
      activeGuests: [],
      roundHistory: []
    };

    await this.db.doc('gameState/live').set({
      ...defaultState,
      ...state
    });
  }

  /**
   * Seed multiple question documents
   * Uses batch write for efficiency
   */
  async seedQuestions(questions: Question[]): Promise<void> {
    const batch = this.db.batch();

    questions.forEach(question => {
      const docRef = this.db.collection('questions').doc(question.id);
      batch.set(docRef, question);
    });

    await batch.commit();
  }

  /**
   * Seed multiple guest documents
   * Uses batch write for efficiency
   */
  async seedGuests(guests: Guest[]): Promise<void> {
    const batch = this.db.batch();

    guests.forEach(guest => {
      const docRef = this.db.collection('guests').doc(guest.id);
      batch.set(docRef, guest);
    });

    await batch.commit();
  }

  /**
   * Clear all test data from Firestore
   * Used for cleanup between tests
   */
  async clearAll(): Promise<void> {
    // Clear gameState collection
    const gameStateSnapshot = await this.db.collection('gameState').get();
    const gameStateBatch = this.db.batch();
    gameStateSnapshot.docs.forEach(doc => {
      gameStateBatch.delete(doc.ref);
    });
    await gameStateBatch.commit();

    // Clear questions collection
    const questionsSnapshot = await this.db.collection('questions').get();
    const questionsBatch = this.db.batch();
    questionsSnapshot.docs.forEach(doc => {
      questionsBatch.delete(doc.ref);
    });
    await questionsBatch.commit();

    // Clear guests collection
    const guestsSnapshot = await this.db.collection('guests').get();
    const guestsBatch = this.db.batch();
    guestsSnapshot.docs.forEach(doc => {
      guestsBatch.delete(doc.ref);
    });
    await guestsBatch.commit();
  }

  /**
   * Clear only gameState collection (faster cleanup)
   */
  async clearGameState(): Promise<void> {
    const snapshot = await this.db.collection('gameState').get();
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  /**
   * Clear only questions collection
   */
  async clearQuestions(): Promise<void> {
    const snapshot = await this.db.collection('questions').get();
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  /**
   * Clear only guests collection
   */
  async clearGuests(): Promise<void> {
    const snapshot = await this.db.collection('guests').get();
    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
}
