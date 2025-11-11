/**
 * TestDataSeeder - Seed Firestore emulator with test data
 * Feature: 008-e2e-playwright-tests
 *
 * Uses Firebase Admin SDK to create test data with collection prefixes
 */

import * as admin from 'firebase-admin';
import type { TestQuestion, TestGuest, TestGameState } from '../fixtures';
import { randomUUID } from 'crypto';

export interface SeededGuest {
  /** Firestore document ID */
  guestId: string;
  /** Join token for authentication */
  joinToken: string;
  /** Full join URL with token */
  joinUrl: string;
}

export class TestDataSeeder {
  private db: admin.firestore.Firestore;

  constructor() {
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      // Set emulator host for test process
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

      admin.initializeApp({
        projectId: 'stg-wedding-allstars',
      });
    }

    this.db = admin.firestore();

    // Explicitly set emulator settings (only if not already set)
    try {
      this.db.settings({
        host: 'localhost:8080',
        ssl: false,
      });
    } catch (error) {
      // Ignore error if settings were already called (serial test execution)
    }
  }

  /**
   * Seed Firestore with test questions
   * @param questions - Array of test questions
   * @param collectionPrefix - Collection prefix for isolation
   * @returns Array of created question IDs
   */
  async seedQuestions(
    questions: TestQuestion[],
    collectionPrefix: string
  ): Promise<string[]> {
    const collectionName = `${collectionPrefix}questions`;
    const questionIds: string[]= [];

    for (const question of questions) {
      const { testId, description, ...questionData } = question;

      // Generate unique question ID
      const questionId = `question-${questionData.questionNumber}`;

      await this.db
        .collection(collectionName)
        .doc(questionId)
        .set({
          ...questionData,
          questionId,
        });

      questionIds.push(questionId);
    }

    return questionIds;
  }

  /**
   * Seed Firestore with test guests
   * @param guests - Array of test guests
   * @param collectionPrefix - Collection prefix for isolation
   * @returns Array of created guest IDs with join tokens
   */
  async seedGuests(
    guests: TestGuest[],
    collectionPrefix: string
  ): Promise<SeededGuest[]> {
    const collectionName = `${collectionPrefix}guests`;
    const seededGuests: SeededGuest[] = [];

    for (const guest of guests) {
      const { testId, description, ...guestData } = guest;

      // Generate unique guest ID and join token
      const guestId = randomUUID();
      const joinToken = randomUUID();

      await this.db
        .collection(collectionName)
        .doc(guestId)
        .set({
          ...guestData,
          id: guestId,
        });

      // Store join token mapping (for authentication flow)
      await this.db
        .collection(`${collectionPrefix}joinTokens`)
        .doc(joinToken)
        .set({
          guestId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      seededGuests.push({
        guestId,
        joinToken,
        joinUrl: `http://work-ubuntu:5173/join?token=${joinToken}`,
      });
    }

    return seededGuests;
  }

  /**
   * Set initial game state in Firestore
   * @param gameState - Initial game state
   * @param collectionPrefix - Collection prefix for isolation (not used, kept for API compatibility)
   */
  async seedGameState(
    gameState: TestGameState,
    collectionPrefix: string
  ): Promise<void> {
    // Apps expect gameState/live (no prefix)
    // Collection prefix is not used because apps are hardcoded to listen to gameState/live
    const { testId, description, ...gameStateData } = gameState;

    // Remove undefined values (Firestore doesn't accept undefined)
    const cleanData = this.removeUndefinedValues(gameStateData);

    // Write to standard gameState/live path that apps expect
    await this.db.collection('gameState').doc('live').set(cleanData);
  }

  /**
   * Remove undefined values from an object (Firestore doesn't accept undefined)
   * @param obj - Object to clean
   * @returns Object without undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeUndefinedValues(item));
    }

    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = this.removeUndefinedValues(value);
      }
    }
    return cleaned;
  }

  /**
   * Clear all test data for a specific collection prefix
   * @param collectionPrefix - Collection prefix to clear
   */
  async clearTestData(collectionPrefix: string): Promise<void> {
    const collections = await this.db.listCollections();

    // Filter collections that start with the test prefix
    const testCollections = collections.filter((col) =>
      col.id.startsWith(collectionPrefix)
    );

    // Delete all documents in matching collections
    for (const collection of testCollections) {
      const snapshot = await collection.get();
      await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
    }
  }
}
