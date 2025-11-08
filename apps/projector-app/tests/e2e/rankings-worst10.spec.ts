import { test, expect } from '@playwright/test';

/**
 * E2E Test: Scenario 1 - Worst 10 Rankings Display
 *
 * Tests the display of worst 10 rankings on non-final questions
 * (when isGongActive = false)
 */

test.describe('TV Rankings - Worst 10 Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the projector app
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should display worst 10 rankings for non-final question', async ({ page }) => {
    // Mock gameState with showing_results phase and worst 10 data
    await page.evaluate(() => {
      // Mock Firestore data
      const mockGameState = {
        id: 'live',
        currentPhase: 'showing_results',
        currentQuestion: {
          questionId: 'q-first-half-001',
          questionText: 'Test Question',
          choices: [],
          period: 'first-half',
          questionNumber: 1,
        },
        isGongActive: false,
        results: {
          worst10: [
            { guestId: 'g1', guestName: '太郎(チームA)', responseTimeMs: 8000 },
            { guestId: 'g2', guestName: '花子(チームB)', responseTimeMs: 8500 },
            { guestId: 'g3', guestName: '次郎(チームC)', responseTimeMs: 9000 },
            { guestId: 'g4', guestName: '三郎(チームD)', responseTimeMs: 9500 },
            { guestId: 'g5', guestName: '四郎(チームE)', responseTimeMs: 10000 },
          ],
          top10: [],
        },
        prizeCarryover: 0,
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };

      // Store in window for access
      (window as any).testGameState = mockGameState;
    });

    // Wait for the rankings container to be visible
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Verify TV branding elements
    await expect(page.locator('.tv-branding')).toBeVisible();
    await expect(page.locator('.live-badge')).toContainText('生放送');
    await expect(page.locator('.period-label')).toContainText('前半');

    // Verify worst 10 section is displayed
    await expect(page.locator('.ranking-list').first()).toBeVisible();

    // Get the ranking list title
    const title = page.locator('.ranking-title').first();
    await expect(title).toContainText('早押しワースト10');

    // Verify ranking entries are displayed
    const entries = page.locator('.ranking-entry');
    await expect(entries).toHaveCount(5);

    // Verify first entry content
    const firstEntry = entries.nth(0);
    await expect(firstEntry.locator('.rank-number')).toContainText('1');
    await expect(firstEntry.locator('.guest-name')).toContainText('太郎(チームA)');
    await expect(firstEntry.locator('.response-time')).toContainText('8.00');

    // Verify last entry is highlighted (slowest response)
    const lastEntry = entries.nth(4);
    await expect(lastEntry).toHaveClass(/highlighted/);
    await expect(lastEntry).toHaveCSS('background-color', /rgba?\(239, 68, 68/); // Red highlight
  });

  test('should NOT display top 10 rankings when isGongActive is false', async ({ page }) => {
    // Mock gameState with isGongActive = false
    await page.evaluate(() => {
      const mockGameState = {
        id: 'live',
        currentPhase: 'showing_results',
        currentQuestion: {
          questionId: 'q-first-half-002',
          period: 'first-half',
        },
        isGongActive: false,
        results: {
          worst10: [
            { guestId: 'g1', guestName: 'Player 1', responseTimeMs: 5000 },
          ],
          top10: [
            { guestId: 'g10', guestName: 'Fast Player', responseTimeMs: 500 },
          ],
        },
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };
      (window as any).testGameState = mockGameState;
    });

    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Should have only 1 ranking list (worst 10)
    const rankingLists = page.locator('.ranking-list');
    await expect(rankingLists).toHaveCount(1);

    // Verify it's the worst 10 list
    await expect(page.locator('.ranking-title')).toContainText('早押しワースト10');

    // Top 10 title should not be present
    await expect(page.locator('text=早押しトップ10')).not.toBeVisible();
  });

  test('should display TV background with animated gradient', async ({ page }) => {
    await expect(page.locator('.tv-background-container')).toBeVisible();

    // Verify gradient layers
    const gradientLayers = page.locator('.gradient-layer');
    await expect(gradientLayers).toHaveCount(3); // Base, overlay, accent

    // Verify animations are applied
    const baseLayer = gradientLayers.nth(0);
    const animationName = await baseLayer.evaluate(el =>
      window.getComputedStyle(el).animationName
    );
    expect(animationName).toBeTruthy();
    expect(animationName).not.toBe('none');
  });

  test('should handle empty worst10 array gracefully', async ({ page }) => {
    await page.evaluate(() => {
      const mockGameState = {
        id: 'live',
        currentPhase: 'showing_results',
        currentQuestion: { questionId: 'q-test', period: 'first-half' },
        isGongActive: false,
        results: {
          worst10: [],
          top10: [],
        },
        lastUpdate: { seconds: Date.now() / 1000, nanoseconds: 0 },
      };
      (window as any).testGameState = mockGameState;
    });

    // Should still render the container
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Should show worst 10 section with no entries
    await expect(page.locator('.ranking-title')).toContainText('早押しワースト10');
    await expect(page.locator('.ranking-entry')).toHaveCount(0);
  });
});
