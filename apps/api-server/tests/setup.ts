/**
 * Jest test environment setup
 * Configures environment variables for Firebase Emulator
 */

// Configure Firebase Emulator environment variables
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FUNCTIONS_EMULATOR = 'true';
process.env.NODE_ENV = 'test';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
