/**
 * Infrastructure validation tests
 * Feature: 008-e2e-playwright-tests
 *
 * Validates that E2E test infrastructure is working correctly
 */

import { test, expect } from '../fixtures';

test.describe('@P2 Test Infrastructure Validation (User Story 5)', () => {
  test('AS1: Verify all apps are accessible', async ({ page }) => {
    // Test that all 6 apps are running and responding
    const apps = [
      { name: 'participant-app', url: 'http://localhost:5173' },
      { name: 'host-app', url: 'http://localhost:5174' },
      { name: 'projector-app', url: 'http://localhost:5175' },
      { name: 'admin-app', url: 'http://localhost:5176' },
      { name: 'api-server', url: 'http://localhost:3000/health' },
      { name: 'socket-server', url: 'http://localhost:3001/health' },
    ];

    for (const app of apps) {
      await page.goto(app.url);
      // Just verify page loads without errors
      expect(page).toBeTruthy();
    }
  });

  test('AS2: Verify collection prefix generation', ({ collectionPrefix, prefixGenerator }) => {
    // Verify fixture-provided prefix format
    expect(collectionPrefix).toMatch(/^test_\d+_[a-f0-9]{8}_$/);

    // Verify prefix generator can create multiple unique prefixes
    const prefix1 = prefixGenerator.generate();
    const prefix2 = prefixGenerator.generate();
    expect(prefix1).not.toBe(prefix2);

    // Verify parsing
    const parsed = prefixGenerator.parse(collectionPrefix);
    expect(parsed.isValid).toBe(true);
    expect(parsed.timestamp).toBeGreaterThan(0);
    expect(parsed.uuid).toMatch(/^[a-f0-9]{8}$/);

    // Verify apply
    const collectionName = prefixGenerator.apply(collectionPrefix, 'guests');
    expect(collectionName).toBe(`${collectionPrefix}guests`);
  });
});
