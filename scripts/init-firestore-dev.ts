#!/usr/bin/env tsx

/**
 * Firestore Development Environment Initialization Script
 *
 * This script initializes the Firestore emulator with the required gameState/live document
 * for local development. It is idempotent and safe to run multiple times.
 *
 * Usage:
 *   pnpm run init:dev
 *
 * Requirements:
 *   - Firestore emulator must be running on localhost:8080
 *   - FIRESTORE_EMULATOR_HOST environment variable must be set
 *
 * Features:
 *   - Production detection: Refuses to run against production Firestore
 *   - Idempotency: Safe to run multiple times without data corruption
 *   - Clear error messages: Provides actionable guidance for common failures
 */

import * as admin from 'firebase-admin';

/**
 * Main initialization function
 */
async function initializeFirestoreDev(): Promise<void> {
  console.log('Initializing Firestore development environment...');

  // SAFETY CHECK: Refuse to run against production
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('✗ FIRESTORE_EMULATOR_HOST not set - refusing to run against production');
    console.error('  Set FIRESTORE_EMULATOR_HOST=localhost:8080 to use emulator');
    process.exit(1);
  }

  try {
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      projectId: 'stg-wedding-allstars',
    });

    // Get Firestore instance and configure for emulator
    const db = admin.firestore();
    db.settings({
      host: 'localhost:8080',
      ssl: false,
    });

    // Reference to the gameState/live document
    const gameStateRef = db.collection('gameState').doc('live');

    // IDEMPOTENCY CHECK: Check if document already exists
    const doc = await gameStateRef.get();

    if (doc.exists) {
      console.log('✓ gameState/live already exists, skipping initialization');
      console.log('✓ Initialization complete');
      process.exit(0);
    }

    // Create initial gameState document
    const initialGameState = {
      currentPhase: 'ready_for_next' as const,
      currentQuestion: null,
      isGongActive: false,
      participantCount: 0,
      timeRemaining: null,
      lastUpdate: admin.firestore.FieldValue.serverTimestamp(),
      results: null,
      prizeCarryover: 0,
      settings: null,
    };

    await gameStateRef.set(initialGameState);

    console.log('✓ gameState/live created successfully');
    console.log('✓ Initialization complete');
    process.exit(0);
  } catch (error: any) {
    // Enhanced error handling with specific messages for common issues
    console.error('✗ Initialization failed:', error.message);

    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      console.error('  Hint: Ensure Firestore emulator is running on localhost:8080');
      console.error('  Start with: firebase emulators:start --only firestore --project stg-wedding-allstars');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timed out')) {
      console.error('  Hint: Check network connectivity to localhost');
      console.error('  Verify Firestore emulator is responding: curl http://localhost:8080');
    } else {
      console.error('  Hint: Check the error details above');
      console.error('  Ensure Firestore emulator is running and accessible');
    }

    process.exit(1);
  }
}

// Execute initialization
initializeFirestoreDev();
