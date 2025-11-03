// Test setup file - mocks Firebase Admin SDK for testing
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));
