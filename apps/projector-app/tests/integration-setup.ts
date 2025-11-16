import { beforeAll } from 'vitest';

/**
 * Integration test setup - validates Firebase Emulators are running
 *
 * CRITICAL: Integration tests MUST run against Firebase Emulators only.
 * This setup file ensures emulators are available before tests execute.
 */
beforeAll(async () => {
  // Check Auth Emulator
  const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  console.log(`✓ Checking Firebase Auth Emulator at ${authEmulatorHost}...`);

  try {
    const authResponse = await fetch(`http://${authEmulatorHost}/`);
    if (!authResponse.ok) {
      throw new Error('Auth Emulator not responding');
    }
    console.log(`✓ Firebase Auth Emulator is running on ${authEmulatorHost}`);
  } catch (error) {
    console.error('✗ Firebase Auth Emulator is not running');
    console.error(`  Hint: Ensure Firebase Auth Emulator is running on ${authEmulatorHost}`);
    console.error('  Start with: firebase emulators:start --only auth');
    throw new Error(`Integration tests require Firebase Auth Emulator on ${authEmulatorHost}`);
  }

  // Check Firestore Emulator
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  console.log(`✓ Checking Firestore Emulator at ${firestoreEmulatorHost}...`);

  try {
    const firestoreResponse = await fetch(`http://${firestoreEmulatorHost}/`);
    if (!firestoreResponse.ok) {
      throw new Error('Firestore Emulator not responding');
    }
    console.log(`✓ Firestore Emulator is running on ${firestoreEmulatorHost}`);
  } catch (error) {
    console.error('✗ Firestore Emulator is not running');
    console.error(`  Hint: Ensure Firestore Emulator is running on ${firestoreEmulatorHost}`);
    console.error('  Start with: firebase emulators:start --only firestore');
    throw new Error(`Integration tests require Firestore Emulator on ${firestoreEmulatorHost}`);
  }

  console.log('✓ All Firebase Emulators are running - integration tests can proceed');
});
