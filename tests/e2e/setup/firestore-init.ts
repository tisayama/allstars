/**
 * FirestoreInit - Initialize Firestore emulator with clean state
 * Feature: 001-system-e2e-tests
 *
 * Provides utilities to clear all data and seed initial state
 */

import * as admin from 'firebase-admin';

export interface FirestoreInitConfig {
  /** Firestore emulator host (default: localhost:8080) */
  emulatorHost?: string;

  /** Firebase project ID (default: stg-wedding-allstars) */
  projectId?: string;
}

const DEFAULT_CONFIG: FirestoreInitConfig = {
  emulatorHost: 'localhost:8080',
  projectId: 'stg-wedding-allstars',
};

export class FirestoreInit {
  private db: admin.firestore.Firestore;
  private config: FirestoreInitConfig;

  constructor(config: Partial<FirestoreInitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Set emulator host environment variable
    process.env.FIRESTORE_EMULATOR_HOST = this.config.emulatorHost;

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: this.config.projectId,
      });
    }

    this.db = admin.firestore();
  }

  /**
   * Clear all data from Firestore emulator
   * Deletes all documents in all collections
   */
  async clearAllData(): Promise<void> {
    const collections = await this.db.listCollections();

    // Delete all documents in each collection
    for (const collection of collections) {
      const snapshot = await collection.get();

      // Use batch delete for efficiency
      const batchSize = 500;
      const batches: admin.firestore.DocumentReference[][] = [];

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        batches.push(snapshot.docs.slice(i, i + batchSize).map(doc => doc.ref));
      }

      for (const batch of batches) {
        const writeBatch = this.db.batch();
        batch.forEach(ref => writeBatch.delete(ref));
        await writeBatch.commit();
      }
    }
  }

  /**
   * Seed initial game state into Firestore
   * Creates minimal required documents for test execution
   */
  async seedInitialState(): Promise<void> {
    // Create initial gameState document
    await this.db.collection('gameState').doc('live').set({
      currentPhase: 'ready_for_next',
      currentQuestion: null,
      isGongActive: false,
      participantCount: 0,
      timeRemaining: null,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      results: null,
      prizeCarryover: 0,
      settings: null,
    });
  }

  /**
   * Clear data for specific collection prefix
   * Used for test isolation with prefixed collections
   * @param prefix - Collection prefix (e.g., "test_abc123")
   */
  async clearPrefixedCollections(prefix: string): Promise<void> {
    const collections = await this.db.listCollections();

    // Filter collections that start with the prefix
    const prefixedCollections = collections.filter(col =>
      col.id.startsWith(prefix)
    );

    // Delete all documents in matching collections
    for (const collection of prefixedCollections) {
      const snapshot = await collection.get();
      const batch = this.db.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }
  }

  /**
   * Get Firestore instance for direct access
   * @returns Firestore instance configured for emulator
   */
  getFirestore(): admin.firestore.Firestore {
    return this.db;
  }

  /**
   * Verify Firestore emulator connectivity
   * @returns true if emulator is accessible, false otherwise
   */
  async isConnected(): Promise<boolean> {
    try {
      // Try to list collections to verify connectivity
      await this.db.listCollections();
      return true;
    } catch (error) {
      return false;
    }
  }
}
