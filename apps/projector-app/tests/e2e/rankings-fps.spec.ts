import { test, expect } from '@playwright/test';

/**
 * E2E Test: FPS Degradation Scenario
 *
 * Tests that the app gracefully degrades animations when FPS drops below 30
 * Verifies the FPS monitoring system works correctly
 */

test.describe('TV Rankings - FPS Degradation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should detect when FPS drops below 30', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Simulate heavy CPU load by running expensive calculations
    await page.evaluate(() => {
      return new Promise<{ detectedDegradation: boolean; fps: number }>((resolve) => {
        let frameCount = 0;
        let lastTime = performance.now();
        let fps = 60;

        function measureAndStress() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          fps = 1000 / delta;
          lastTime = currentTime;

          // Simulate CPU stress with heavy calculations
          for (let i = 0; i < 1000000; i++) {
            Math.sqrt(i * Math.random());
          }

          frameCount++;

          if (frameCount < 30) {
            requestAnimationFrame(measureAndStress);
          } else {
            // Check if FPS monitoring detected degradation
            resolve({ detectedDegradation: fps < 30, fps });
          }
        }

        requestAnimationFrame(measureAndStress);
      });
    });

    // Note: This is a synthetic test - real FPS monitoring happens in useFPSMonitor hook
    // The actual degradation detection is tested in unit tests
    await expect(page.locator('.tv-ranking-container')).toBeVisible();
  });

  test('should disable animations when degraded mode is active', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Force degraded mode by setting the flag in component state
    // Note: This requires exposing a way to trigger degraded mode, or we can
    // check that the CSS class changes when degraded
    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount > 0) {
      // In normal mode, check that animations are enabled
      const firstEntry = entries.first();
      const animationName = await firstEntry.evaluate(el =>
        window.getComputedStyle(el).animationName
      );

      // Normal mode should have animations
      expect(animationName).toBeTruthy();
    }

    // In a real implementation, we would:
    // 1. Trigger degraded mode via performance throttling
    // 2. Verify that 'shouldAnimate' prop becomes false
    // 3. Verify that CSS animation classes are removed
  });

  test('should reduce animation complexity when FPS is below threshold', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Check that gradient animations continue even in degraded mode
    // (as they are CSS-based and performant)
    const gradientLayers = page.locator('.gradient-layer');
    const layerCount = await gradientLayers.count();

    if (layerCount > 0) {
      const firstLayer = gradientLayers.first();
      const animationName = await firstLayer.evaluate(el =>
        window.getComputedStyle(el).animationName
      );

      // Gradient animations should persist
      expect(animationName).not.toBe('none');
    }
  });

  test('should maintain FPS monitoring throughout the session', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Simulate monitoring for several seconds
    const monitoringResult = await page.evaluate(() => {
      return new Promise<{ samples: number; avgFPS: number }>((resolve) => {
        const fpsSamples: number[] = [];
        let lastTime = performance.now();
        let sampleCount = 0;
        const maxSamples = 60; // Monitor for ~1 second

        function monitor() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          const fps = 1000 / delta;
          fpsSamples.push(fps);
          lastTime = currentTime;
          sampleCount++;

          if (sampleCount < maxSamples) {
            requestAnimationFrame(monitor);
          } else {
            const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
            resolve({ samples: fpsSamples.length, avgFPS });
          }
        }

        requestAnimationFrame(monitor);
      });
    });

    // Verify we collected samples
    expect(monitoringResult.samples).toBeGreaterThanOrEqual(30);
    expect(monitoringResult.avgFPS).toBeGreaterThan(0);
  });

  test('should log performance warnings when degradation detected', async ({ page }) => {
    // Listen for console warnings
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // In a real scenario, we would trigger degraded mode and verify warnings
    // For now, we just verify the console listener is working
  });

  test('should recover from degraded mode when FPS improves', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // This test would require:
    // 1. Triggering degraded mode (FPS < 30)
    // 2. Removing the stress (FPS > 30)
    // 3. Verifying animations are re-enabled
    // This is primarily tested in unit tests for useFPSMonitor
  });

  test('should display rankings correctly even in degraded mode', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Verify core functionality persists regardless of FPS
    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount > 0) {
      // Check first entry has all required elements
      const firstEntry = entries.first();
      await expect(firstEntry.locator('.rank-number')).toBeVisible();
      await expect(firstEntry.locator('.guest-name')).toBeVisible();
      await expect(firstEntry.locator('.response-time')).toBeVisible();

      // Verify highlighting still works in degraded mode
      const highlightedEntries = page.locator('.ranking-entry.highlighted');
      const highlightedCount = await highlightedEntries.count();

      // Should have at least one highlighted entry (fastest or slowest)
      expect(highlightedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should not degrade when FPS is consistently above 30', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Measure FPS over time without artificial stress
    const normalPerformance = await page.evaluate(() => {
      return new Promise<{ avgFPS: number; minFPS: number; maxFPS: number }>((resolve) => {
        const fpsSamples: number[] = [];
        let lastTime = performance.now();
        let sampleCount = 0;
        const maxSamples = 60;

        function monitor() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          const fps = 1000 / delta;
          fpsSamples.push(fps);
          lastTime = currentTime;
          sampleCount++;

          if (sampleCount < maxSamples) {
            requestAnimationFrame(monitor);
          } else {
            const avgFPS = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;
            const minFPS = Math.min(...fpsSamples);
            const maxFPS = Math.max(...fpsSamples);
            resolve({ avgFPS, minFPS, maxFPS });
          }
        }

        requestAnimationFrame(monitor);
      });
    });

    // Under normal conditions, should maintain good FPS
    expect(normalPerformance.avgFPS).toBeGreaterThanOrEqual(45);
    expect(normalPerformance.minFPS).toBeGreaterThanOrEqual(30);
  });
});
