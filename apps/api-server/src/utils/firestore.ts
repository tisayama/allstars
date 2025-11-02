/**
 * Firestore client initialization with emulator detection
 * Automatically connects to Firebase Emulator Suite when running locally
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Firestore instance
const db = admin.firestore();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

// Detect emulator mode from environment variables
const isEmulator = process.env.FIRESTORE_EMULATOR_HOST !== undefined;

if (isEmulator) {
  console.log(
    `[Firestore] Connected to emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`
  );
} else {
  console.log("[Firestore] Connected to production database");
}

export { db, admin };
export const isEmulatorMode = isEmulator;
