/**
 * Firebase SDK initialization with emulator support
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { config } from './config';

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

/**
 * Initialize Firebase app and services
 * @returns Initialized Firebase app
 */
export function initializeFirebase(): FirebaseApp {
  if (app) {
    return app;
  }

  // Initialize Firebase app
  app = initializeApp({
    projectId: config.firebase.projectId,
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    storageBucket: config.firebase.storageBucket,
  });

  // Initialize Firestore
  firestore = getFirestore(app);

  // Initialize Storage
  storage = getStorage(app);

  // Initialize Auth
  auth = getAuth(app);

  // Connect to emulators if enabled
  if (config.firebase.useEmulators) {
    const emulatorHost = window.location.hostname;
    try {
      connectFirestoreEmulator(firestore, emulatorHost, 8080);
      connectStorageEmulator(storage, emulatorHost, 9199);
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      console.log(`Connected to Firebase emulators at ${emulatorHost} (Firestore: 8080, Storage: 9199, Auth: 9099)`);
    } catch (error) {
      // Emulator connection may fail if already connected
      console.warn('Firebase emulator connection warning:', error);
    }
  }

  return app;
}

/**
 * Get initialized Firestore instance
 * @throws Error if Firebase not initialized
 */
export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firestore;
}

/**
 * Get initialized Storage instance
 * @throws Error if Firebase not initialized
 */
export function getStorageInstance(): FirebaseStorage {
  if (!storage) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return storage;
}

/**
 * Get initialized Firebase app
 * @throws Error if Firebase not initialized
 */
export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return app;
}

/**
 * Get initialized Auth instance
 * @throws Error if Firebase not initialized
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return auth;
}
