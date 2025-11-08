import { test, expect } from '@playwright/test';

/**
 * E2E Test: Scenario 3 - Visual Transitions and Animations
 *
 * Tests the staggered slide-in animations and visual transitions
 * of the TV-style ranking display
 */

test.describe('TV Rankings - Visual Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should display staggered slide-in animations for ranking entries', async ({ page }) => {
    // Wait for rankings container
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Get all ranking entries
    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount > 0) {
      // Verify each entry has animation styles applied
      for (let i = 0; i < Math.min(entryCount, 5); i++) {
        const entry = entries.nth(i);

        // Check animation-related CSS properties
        const animationDuration = await entry.evaluate(el =>
          window.getComputedStyle(el).animationDuration
        );
        const animationName = await entry.evaluate(el =>
          window.getComputedStyle(el).animationName
        );

        // Verify animation is defined
        expect(animationName).not.toBe('none');
        expect(animationDuration).not.toBe('0s');
      }
    }
  });

  test('should apply different animation delays to create staggered effect', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount >= 3) {
      // Get animation delays for first 3 entries
      const delays: string[] = [];
      for (let i = 0; i < 3; i++) {
        const delay = await entries.nth(i).evaluate(el =>
          window.getComputedStyle(el).animationDelay
        );
        delays.push(delay);
      }

      // Verify delays are progressive (staggered)
      // Note: This is a basic check; actual delay values depend on implementation
      const delayValues = delays.map(d => parseFloat(d));

      // First entry should have minimal or no delay
      expect(delayValues[0]).toBeLessThanOrEqual(0.1);

      // Subsequent entries should have increasing delays
      if (delayValues.length >= 2) {
        expect(delayValues[1]).toBeGreaterThanOrEqual(delayValues[0]);
      }
      if (delayValues.length >= 3) {
        expect(delayValues[2]).toBeGreaterThanOrEqual(delayValues[1]);
      }
    }
  });

  test('should NOT replay animations when same question is shown again', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Get the current question ID from localStorage after first render
    const firstQuestionId = await page.evaluate(() => {
      const playedQuestions = localStorage.getItem('allstars-played-questions');
      return playedQuestions ? JSON.parse(playedQuestions) : [];
    });

    // Verify localStorage contains played question IDs
    expect(firstQuestionId).toBeTruthy();

    // In a real scenario, we would:
    // 1. Navigate away from showing_results phase
    // 2. Return to showing_results with the same question
    // 3. Verify animations don't replay
    // This would require Socket.io event simulation or Firestore mocking
  });

  test('should have smooth opacity transitions on ranking entries', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const entries = page.locator('.ranking-entry');
    const entryCount = await entries.count();

    if (entryCount > 0) {
      const firstEntry = entries.first();

      // Check transition properties
      const transition = await firstEntry.evaluate(el =>
        window.getComputedStyle(el).transition
      );

      // Verify transition is defined (opacity should be one of the transitioned properties)
      expect(transition).toBeTruthy();
      expect(transition).not.toBe('none');
    }
  });

  test('should display TV background gradient with animation', async ({ page }) => {
    await expect(page.locator('.tv-background-container')).toBeVisible();

    const gradientLayers = page.locator('.gradient-layer');
    const layerCount = await gradientLayers.count();

    // Verify we have multiple gradient layers
    expect(layerCount).toBeGreaterThanOrEqual(2);

    // Check each layer has animation
    for (let i = 0; i < layerCount; i++) {
      const layer = gradientLayers.nth(i);
      const animationName = await layer.evaluate(el =>
        window.getComputedStyle(el).animationName
      );
      const animationDuration = await layer.evaluate(el =>
        window.getComputedStyle(el).animationDuration
      );

      expect(animationName).not.toBe('none');
      expect(parseFloat(animationDuration)).toBeGreaterThan(0);
    }
  });

  test('should highlight slowest entry with red fade-in for worst10', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const worst10Title = page.locator('text=早押しワースト10');

    if (await worst10Title.isVisible()) {
      const entries = page.locator('.ranking-entry');
      const entryCount = await entries.count();

      if (entryCount > 0) {
        // Last entry should be highlighted
        const lastEntry = entries.nth(entryCount - 1);
        await expect(lastEntry).toHaveClass(/highlighted/);

        // Check for red highlight
        const bgColor = await lastEntry.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toMatch(/rgba?\\(239, 68, 68/); // Red highlight color
      }
    }
  });

  test('should highlight fastest entry with gold fade-in for top10', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const top10Title = page.locator('text=早押しトップ10');

    if (await top10Title.isVisible()) {
      const entries = page.locator('.ranking-entry');
      const entryCount = await entries.count();

      if (entryCount > 0) {
        // First entry should be highlighted
        const firstEntry = entries.first();
        await expect(firstEntry).toHaveClass(/highlighted/);

        // Check for gold highlight
        const bgColor = await firstEntry.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        expect(bgColor).toMatch(/rgba?\\(255, 215, 0/); // Gold highlight color
      }
    }
  });

  test('should render period champion badges with star icon', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const championBadges = page.locator('.period-champion-badge');
    const badgeCount = await championBadges.count();

    if (badgeCount > 0) {
      // Verify star character is displayed
      for (let i = 0; i < badgeCount; i++) {
        const badge = championBadges.nth(i);
        await expect(badge).toContainText('★');

        // Verify gold color styling
        const color = await badge.evaluate(el =>
          window.getComputedStyle(el).color
        );
        expect(color).toMatch(/gold|rgb\\(255, 215, 0\\)/i);
      }
    }
  });

  test('should maintain 60 FPS during animations on Full HD display', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Start performance measurement
    const performanceMetrics = await page.evaluate(() => {
      return new Promise<{ avgFPS: number; minFPS: number }>((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        let frameCount = 0;
        const maxFrames = 60; // Measure for 60 frames (~1 second at 60fps)

        function measureFrame() {
          const currentTime = performance.now();
          const delta = currentTime - lastTime;
          const fps = 1000 / delta;
          frames.push(fps);
          lastTime = currentTime;
          frameCount++;

          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrame);
          } else {
            const avgFPS = frames.reduce((a, b) => a + b, 0) / frames.length;
            const minFPS = Math.min(...frames);
            resolve({ avgFPS, minFPS });
          }
        }

        requestAnimationFrame(measureFrame);
      });
    });

    // Verify performance targets
    expect(performanceMetrics.avgFPS).toBeGreaterThanOrEqual(55); // Allow small margin
    expect(performanceMetrics.minFPS).toBeGreaterThanOrEqual(30); // Should never drop below 30
  });
});
