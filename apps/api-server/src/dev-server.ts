/**
 * Development server for local E2E testing
 *
 * This runs the Express app standalone on port 3000 for E2E tests.
 * In production, the app runs as a Firebase Cloud Function.
 */

import { app } from './index';
import * as admin from 'firebase-admin';

const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK for emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || 'stg-wedding-allstars',
  });
}

// Set emulator host if provided
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`🔧 Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log(`🔧 Using Auth Emulator: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
}

// Start the Express server
const server = app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
