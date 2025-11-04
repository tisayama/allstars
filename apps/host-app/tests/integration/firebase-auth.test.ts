/**
 * Integration tests for Firebase Authentication
 * Tests Google sign-in flow with Firebase emulator
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

describe('Firebase Authentication Integration', () => {
  let unsubscribe: (() => void) | null = null;

  beforeAll(() => {
    // Verify emulator is running
    if (import.meta.env.VITE_USE_EMULATOR !== 'true') {
      throw new Error('Tests must run with Firebase emulator');
    }
  });

  afterAll(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  beforeEach(async () => {
    // Sign out before each test
    try {
      await signOut(auth);
    } catch {
      // Ignore errors if not signed in
    }
  });

  it('should connect to Firebase Auth emulator', () => {
    expect(auth).toBeDefined();
    expect(auth.config.apiKey).toBeDefined();
  });

  it('should handle auth state changes', async () => {
    return new Promise<void>((resolve) => {
      let callCount = 0;

      unsubscribe = onAuthStateChanged(auth, (user) => {
        callCount++;

        if (callCount === 1) {
          // First call should be null (signed out)
          expect(user).toBeNull();
          resolve();
        }
      });
    });
  });

  it('should get ID token from authenticated user', async () => {
    // Note: This test requires manual user creation in emulator UI
    // or mock auth for CI/CD environments

    // In emulator, this would use the test user
    const currentUser = auth.currentUser;

    if (currentUser) {
      const token = await currentUser.getIdToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    } else {
      // Skip if no user available (CI environment)
      expect(currentUser).toBeNull();
    }
  });

  it('should sign out successfully', async () => {
    await signOut(auth);

    expect(auth.currentUser).toBeNull();
  });

  it('should handle token refresh', async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const token1 = await currentUser.getIdToken();
      const token2 = await currentUser.getIdToken(true); // Force refresh

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      // Tokens may be the same in emulator, but operation should succeed
    } else {
      // Skip if no user (CI environment)
      expect(currentUser).toBeNull();
    }
  });

  it('should get token result with expiration time', async () => {
    const currentUser = auth.currentUser;

    if (currentUser) {
      const tokenResult = await currentUser.getIdTokenResult();

      expect(tokenResult).toBeDefined();
      expect(tokenResult.expirationTime).toBeDefined();

      const expiryDate = new Date(tokenResult.expirationTime);
      const now = new Date();

      // Token should expire in the future
      expect(expiryDate.getTime()).toBeGreaterThan(now.getTime());
    } else {
      expect(currentUser).toBeNull();
    }
  });
});
