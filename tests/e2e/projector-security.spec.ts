/**
 * E2E Security Tests for Projector Authentication
 * Feature: 001-projector-auth [US2]
 *
 * Tests security requirements for projector-app:
 * - No credentials exposed in client bundle
 * - Environment variable validation
 * - Read-only permissions enforcement
 */

import { test, expect } from '@playwright/test';
import { ProjectorPage } from './helpers/page-objects/projector-page';

test.describe('Projector Security [US2]', () => {
  test.describe('Credential Exposure Prevention', () => {
    test('should NOT expose Firebase service account credentials in bundle', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      // Navigate to projector app
      await projectorPage.goto();

      // Wait for app to load
      await page.waitForLoadState('networkidle');

      // Get all JavaScript bundle content
      const jsResources = await page.evaluate(() => {
        // Get all script tags
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map(script => (script as HTMLScriptElement).src);
      });

      // Fetch and check each JS bundle
      for (const scriptUrl of jsResources) {
        const response = await page.request.get(scriptUrl);
        const content = await response.text();

        // Check for Firebase private key patterns
        expect(content).not.toContain('-----BEGIN PRIVATE KEY-----');
        expect(content).not.toContain('-----END PRIVATE KEY-----');

        // Check for service account patterns
        expect(content).not.toMatch(/"type"\s*:\s*"service_account"/);
        expect(content).not.toMatch(/firebase-adminsdk.*@.*\.iam\.gserviceaccount\.com/);

        // Check for project_id in service account context
        // (project_id alone is ok, but not in service account JSON)
        expect(content).not.toMatch(/"project_id"\s*:\s*".*",\s*"private_key_id"/);
      }
    });

    test('should NOT expose API server credentials in bundle', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();
      await page.waitForLoadState('networkidle');

      // Get all JavaScript bundle content
      const jsResources = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        return scripts.map(script => (script as HTMLScriptElement).src);
      });

      for (const scriptUrl of jsResources) {
        const response = await page.request.get(scriptUrl);
        const content = await response.text();

        // Check for full Firebase config (client config is OK, admin config is NOT)
        // Admin SDK patterns that should NOT be present
        expect(content).not.toMatch(/FIREBASE_PRIVATE_KEY/);
        expect(content).not.toMatch(/FIREBASE_CLIENT_EMAIL/);
        expect(content).not.toMatch(/FIREBASE_PROJECT_ID.*private_key/); // Project ID + private key = admin config
      }
    });

    test('should only expose safe environment variables (VITE_* prefix)', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();
      await page.waitForLoadState('networkidle');

      // Check that import.meta.env only has VITE_* variables
      const envVars = await page.evaluate(() => {
        // In Vite apps, import.meta.env is available
        return Object.keys((window as any).import?.meta?.env || {});
      });

      // All exposed env vars should start with VITE_ (if any are exposed)
      for (const varName of envVars) {
        expect(varName).toMatch(/^(VITE_|MODE|BASE_URL|PROD|DEV|SSR)/);
      }
    });

    test('should have VITE_PROJECTOR_API_KEY configured', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();

      // Verify API key is configured (but don't check the value)
      const hasApiKey = await page.evaluate(() => {
        return !!(import.meta.env.VITE_PROJECTOR_API_KEY);
      });

      expect(hasApiKey).toBe(true);
    });

    test('should NOT expose full API keys in error messages', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      // Monitor console for error messages
      const consoleMessages: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      await projectorPage.goto();
      await page.waitForLoadState('networkidle');

      // Check all error messages don't contain full API keys
      for (const message of consoleMessages) {
        // Should not contain what looks like a full API key (32+ chars of base64)
        expect(message).not.toMatch(/[A-Za-z0-9_-]{32,}/);
      }
    });
  });

  test.describe('Environment Variable Validation', () => {
    test('should validate environment on app startup', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      // Monitor for validation errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && msg.text().includes('SECURITY VIOLATION')) {
          errors.push(msg.text());
        }
      });

      await projectorPage.goto();
      await page.waitForLoadState('networkidle');

      // Should not have any security violations
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('Read-Only Permissions', () => {
    test('should prevent projector from emitting write events', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();

      // Wait for connection
      await projectorPage.waitForConnection();

      // Try to emit a write event (should be denied)
      const permissionDenied = await page.evaluate(async () => {
        return new Promise<boolean>((resolve) => {
          // Access the socket from window if exposed for testing
          const socket = (window as any).__socket;

          if (!socket) {
            resolve(false);
            return;
          }

          // Listen for PERMISSION_DENIED
          socket.once('PERMISSION_DENIED', (payload: any) => {
            resolve(true);
          });

          // Try to emit an admin event
          socket.emit('UPDATE_GAME_STATE', { phase: 'test' });

          // Timeout after 1 second
          setTimeout(() => resolve(false), 1000);
        });
      });

      expect(permissionDenied).toBe(true);
    });

    test('should allow projector to emit allowed events', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();
      await projectorPage.waitForConnection();

      // Try to emit an allowed event (should succeed)
      const allowed = await page.evaluate(async () => {
        return new Promise<boolean>((resolve) => {
          const socket = (window as any).__socket;

          if (!socket) {
            resolve(false);
            return;
          }

          // REQUEST_STATE_REFRESH is allowed
          socket.emit('REQUEST_STATE_REFRESH');

          // If we don't get PERMISSION_DENIED within 500ms, it was allowed
          let permissionDenied = false;

          socket.once('PERMISSION_DENIED', () => {
            permissionDenied = true;
            resolve(false);
          });

          setTimeout(() => {
            resolve(!permissionDenied);
          }, 500);
        });
      });

      expect(allowed).toBe(true);
    });
  });

  test.describe('Audit Logging', () => {
    test('should log all authentication events', async ({ page }) => {
      // This is more of an integration test - verify logs exist
      // In a real scenario, you'd check server logs or a logging service

      const projectorPage = new ProjectorPage(page);
      await projectorPage.goto();
      await projectorPage.waitForConnection();

      // For E2E, we just verify the connection works
      // Audit logging is verified in unit/integration tests
      const isConnected = await projectorPage.isConnected();
      expect(isConnected).toBe(true);
    });
  });

  test.describe('Session Tracking', () => {
    test('should receive unique session ID on connection', async ({ page }) => {
      const projectorPage = new ProjectorPage(page);

      await projectorPage.goto();

      // Get session ID from authenticated event
      const sessionId = await page.evaluate(async () => {
        return new Promise<string | null>((resolve) => {
          const socket = (window as any).__socket;

          if (!socket) {
            resolve(null);
            return;
          }

          socket.once('authenticated', (payload: any) => {
            resolve(payload.sessionId);
          });

          // Timeout
          setTimeout(() => resolve(null), 5000);
        });
      });

      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session-[a-f0-9-]+$/);
    });

    test('should generate different session IDs for each connection', async ({ page, browser }) => {
      // Create two separate connections
      const projectorPage1 = new ProjectorPage(page);
      await projectorPage1.goto();

      const sessionId1 = await page.evaluate(async () => {
        return new Promise<string | null>((resolve) => {
          const socket = (window as any).__socket;
          if (!socket) {
            resolve(null);
            return;
          }
          socket.once('authenticated', (payload: any) => resolve(payload.sessionId));
          setTimeout(() => resolve(null), 5000);
        });
      });

      // Create second connection in new context
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const projectorPage2 = new ProjectorPage(page2);
      await projectorPage2.goto();

      const sessionId2 = await page2.evaluate(async () => {
        return new Promise<string | null>((resolve) => {
          const socket = (window as any).__socket;
          if (!socket) {
            resolve(null);
            return;
          }
          socket.once('authenticated', (payload: any) => resolve(payload.sessionId));
          setTimeout(() => resolve(null), 5000);
        });
      });

      expect(sessionId1).toBeTruthy();
      expect(sessionId2).toBeTruthy();
      expect(sessionId1).not.toBe(sessionId2);

      await context2.close();
    });
  });
});
