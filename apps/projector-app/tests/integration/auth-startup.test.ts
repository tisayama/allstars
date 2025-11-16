/**
 * Integration tests for Firebase Authentication startup flow
 * Feature: 001-projector-anonymous-auth
 *
 * Tests the full authentication flow from app initialization to authenticated state
 * using Firebase emulators (Auth + Firestore)
 *
 * Prerequisites:
 * - Firebase emulators must be running (Auth on localhost:9099)
 * - Set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST env vars
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectorAuth } from '../../src/hooks/useProjectorAuth';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase test configuration
const testConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-wedding-allstars',
};

describe('Auth Startup Integration Tests', () => {
  let testApp: FirebaseApp;
  let testAuth: Auth;

  beforeEach(() => {
    // Initialize Firebase app for testing
    testApp = initializeApp(testConfig, `test-app-${Date.now()}`);
    testAuth = getAuth(testApp);

    // Connect to Firebase Auth emulator if running
    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      const [host, port] = process.env.FIREBASE_AUTH_EMULATOR_HOST.split(':');
      // Note: Using any to bypass TypeScript strict mode for test
      (testAuth as any)._emulator = { host, port: parseInt(port) };
    }
  });

  afterEach(async () => {
    // Clean up Firebase app
    if (testApp) {
      await deleteApp(testApp);
    }
  });

  /**
   * T026: Verify full authentication flow from app initialization to authenticated state
   *
   * Success criteria:
   * - Authentication completes within 3 seconds
   * - User object is populated
   * - isAuthenticated becomes true
   * - No errors occur
   */
  it('should complete full authentication flow within 3 seconds', async () => {
    const startTime = Date.now();

    const { result } = renderHook(() => useProjectorAuth());

    // Initial state should be loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();

    // Wait for authentication to complete
    await waitFor(
      () => {
        expect(result.current.isAuthenticated).toBe(true);
      },
      { timeout: 3000 } // Must complete within 3 seconds (success criteria)
    );

    const authTime = Date.now() - startTime;

    // Verify authentication completed
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.isAnonymous).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify timing requirement
    expect(authTime).toBeLessThan(3000);

    console.log(`✓ Authentication completed in ${authTime}ms`);
  }, 5000); // Allow 5s total for test (includes setup/cleanup)

  /**
   * T027: Verify session restoration works across simulated app restarts
   *
   * Success criteria:
   * - First authentication creates session
   * - Unmount/remount simulates app restart
   * - Second mount restores session without re-authentication
   * - Same user UID is maintained
   */
  it('should restore session across app restarts', async () => {
    // First mount - initial authentication
    const { result: firstMount, unmount: unmountFirst } = renderHook(() =>
      useProjectorAuth()
    );

    await waitFor(() => {
      expect(firstMount.current.isAuthenticated).toBe(true);
    });

    const firstUid = firstMount.current.user?.uid;
    expect(firstUid).toBeDefined();

    console.log(`✓ First authentication completed, UID: ${firstUid}`);

    // Simulate app restart (unmount)
    unmountFirst();

    // Small delay to simulate app restart
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Second mount - session should be restored
    const startTime = Date.now();
    const { result: secondMount } = renderHook(() => useProjectorAuth());

    await waitFor(() => {
      expect(secondMount.current.isAuthenticated).toBe(true);
    });

    const restoreTime = Date.now() - startTime;
    const secondUid = secondMount.current.user?.uid;

    // Verify session was restored (same UID)
    expect(secondUid).toBe(firstUid);
    expect(secondMount.current.user?.isAnonymous).toBe(true);
    expect(secondMount.current.error).toBeNull();

    // Session restoration should be faster than initial auth
    expect(restoreTime).toBeLessThan(3000);

    console.log(
      `✓ Session restored in ${restoreTime}ms, same UID: ${secondUid}`
    );
  }, 10000); // Allow 10s for full test (includes two auth flows)

  /**
   * Additional integration test: Verify ID token can be retrieved
   *
   * This validates that the authenticated user can obtain an ID token
   * for use with WebSocket and Firestore connections
   */
  it('should provide valid ID token after authentication', async () => {
    const { result } = renderHook(() => useProjectorAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Retrieve ID token
    const idToken = await result.current.user?.getIdToken();

    expect(idToken).toBeDefined();
    expect(typeof idToken).toBe('string');
    expect(idToken!.length).toBeGreaterThan(0);

    console.log(`✓ ID token retrieved, length: ${idToken!.length} chars`);
  }, 5000);

  /**
   * Additional integration test: Verify anonymous user properties
   *
   * Validates that the authenticated user has expected anonymous user properties
   */
  it('should create anonymous user with correct properties', async () => {
    const { result } = renderHook(() => useProjectorAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    const user = result.current.user;

    // Verify anonymous user properties
    expect(user).not.toBeNull();
    expect(user!.isAnonymous).toBe(true);
    expect(user!.uid).toBeDefined();
    expect(user!.uid.length).toBeGreaterThan(0);
    expect(user!.email).toBeNull(); // Anonymous users don't have email
    expect(user!.displayName).toBeNull(); // Anonymous users don't have display name

    console.log(`✓ Anonymous user created with UID: ${user!.uid}`);
  }, 5000);
});
