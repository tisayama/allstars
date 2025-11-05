import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let firestore: Firestore | undefined;
let initialized = false;

/**
 * Initialize Firebase SDK with environment configuration.
 * Connects to emulators if VITE_USE_EMULATORS is true.
 *
 * @throws Error if required environment variables are missing
 */
export function initializeFirebase(): void {
  if (initialized) {
    return; // Already initialized
  }
  // Validate required environment variables
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
  ];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  // Firebase configuration from environment variables
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };

  // Initialize Firebase app (or get existing instance)
  try {
    app = getApp();
  } catch {
    app = initializeApp(firebaseConfig);
  }

  // Initialize Firebase services
  auth = getAuth(app);
  firestore = getFirestore(app);

  // Connect to emulators if configured
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    const emulatorHost = window.location.hostname;

    try {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    } catch (error) {
      // Emulator already connected, ignore error
      console.warn('Auth emulator already connected:', error);
    }

    try {
      connectFirestoreEmulator(firestore, emulatorHost, 8080);
    } catch (error) {
      // Emulator already connected, ignore error
      console.warn('Firestore emulator already connected:', error);
    }
  }

  initialized = true;
}

// Initialize Firebase on module load (skip in test environment)
if (import.meta.env.MODE !== 'test') {
  initializeFirebase();
}

// Export Firebase service instances with getters
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return auth;
}

export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firestore;
}

// For backward compatibility
export { auth, firestore };

// For testing only - reset initialization state
export function resetFirebaseForTesting(): void {
  if (import.meta.env.MODE === 'test') {
    initialized = false;
    auth = undefined;
    firestore = undefined;
  }
}
