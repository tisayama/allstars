/**
 * Vitest setup file
 * Configures testing environment with jsdom and @testing-library
 */

import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'localhost');
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:5001/test-project/us-central1');
vi.stubEnv('VITE_PARTICIPANT_APP_URL', 'http://localhost:5174');
vi.stubEnv('VITE_USE_EMULATORS', 'true');
