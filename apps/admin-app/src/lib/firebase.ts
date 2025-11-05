/**
 * Firebase SDK initialization with emulator support
 * Validates VITE_PARTICIPANT_APP_URL at startup per FR-053
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Validate required environment variables
const requiredEnvVars = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_PARTICIPANT_APP_URL: import.meta.env.VITE_PARTICIPANT_APP_URL,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
  );
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators if configured
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';

if (useEmulators) {
  const emulatorHost = window.location.hostname;
  console.log(`🔧 Connecting to Firebase emulators at ${emulatorHost}...`);

  // Auth emulator (default: localhost:9099)
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });

  // Firestore emulator (default: localhost:8080)
  connectFirestoreEmulator(db, emulatorHost, 8080);

  // Storage emulator (default: localhost:9199)
  connectStorageEmulator(storage, emulatorHost, 9199);

  // Functions emulator (default: localhost:5001)
  connectFunctionsEmulator(functions, emulatorHost, 5001);

  console.log(`✅ Connected to Firebase emulators at ${emulatorHost}`);
}

// Export participant app URL for QR code generation
export const participantAppUrl = import.meta.env.VITE_PARTICIPANT_APP_URL;
