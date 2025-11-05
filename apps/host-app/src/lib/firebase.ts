/**
 * Firebase SDK initialization
 * Configures Firebase Auth and Firestore with emulator support
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore
export const firestore = getFirestore(app);

// Connect to emulators if enabled
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
  const emulatorHost = window.location.hostname;
  const authUrl = import.meta.env.VITE_EMULATOR_AUTH_URL || `http://${emulatorHost}:9099`;
  const firestoreHost = import.meta.env.VITE_EMULATOR_FIRESTORE_HOST || emulatorHost;
  const firestorePort = parseInt(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || '8080', 10);

  connectAuthEmulator(auth, authUrl);
  connectFirestoreEmulator(firestore, firestoreHost, firestorePort);

  console.log('🔧 Firebase emulators connected:', {
    auth: authUrl,
    firestore: `${firestoreHost}:${firestorePort}`,
  });
}
