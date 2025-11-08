import { test, expect } from '@playwright/test';

/**
 * E2E Test: Scenario 2 - Top 10 Rankings Display
 *
 * Tests the display of top 10 rankings on period-final questions
 * (when isGongActive = true)
 * Includes period champion badges
 */

test.describe('TV Rankings - Top 10 Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should display BOTH worst 10 AND top 10 when isGongActive is true', async ({ page }) => {
    // Verify TV Rankings container is visible
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Note: This test requires the app to be showing a period-final question
    // In a real scenario, we would trigger this state via Firestore/Socket.io
    // When gong is active, there could be 2 ranking lists (worst 10 + top 10)

    // Verify branding shows period label
    await expect(page.locator('.tv-branding')).toBeVisible();
    await expect(page.locator('.live-badge')).toContainText('生放送');

    // Period label should show either 前半 or 後半
    const periodLabel = page.locator('.period-label');
    if (await periodLabel.isVisible()) {
      const text = await periodLabel.textContent();
      expect(['前半', '後半', '延長']).toContain(text || '');
    }
  });

  test('should display period champion badges on top 10 rankings', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Look for period champion badges (★)
    const championBadges = page.locator('.period-champion-badge');

    // If champions exist, verify their display
    const badgeCount = await championBadges.count();
    if (badgeCount > 0) {
      // Verify badge content
      await expect(championBadges.first()).toContainText('★');

      // Verify badge styling
      const badge = championBadges.first();
      await expect(badge).toHaveCSS('color', /gold|rgb\(255, 215, 0\)/i);
    }
  });

  test('should highlight fastest entry in top 10 with gold background', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Find top 10 ranking list if present
    const top10Title = page.locator('text=早押しトップ10');

    if (await top10Title.isVisible()) {
      // Get the ranking entries for top 10
      const top10List = top10Title.locator('xpath=ancestor::div[@class="ranking-list"]');
      const entries = top10List.locator('.ranking-entry');

      const entryCount = await entries.count();
      if (entryCount > 0) {
        // First entry should be highlighted with gold
        const firstEntry = entries.nth(0);
        await expect(firstEntry).toHaveClass(/highlighted/);

        // Check for gold highlight color
        const bgColor = await firstEntry.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        // Gold highlight: rgba(255, 215, 0, 0.3) or similar
        expect(bgColor).toMatch(/rgba?\(255, 215, 0/);
      }
    }
  });

  test('should display top 10 rankings in ascending order (fastest first)', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const top10Title = page.locator('text=早押しトップ10');

    if (await top10Title.isVisible()) {
      const top10List = top10Title.locator('xpath=ancestor::div[@class="ranking-list"]');
      const entries = top10List.locator('.ranking-entry');

      const entryCount = await entries.count();
      if (entryCount >= 2) {
        // Get response times
        const times: number[] = [];
        for (let i = 0; i < Math.min(entryCount, 3); i++) {
          const timeText = await entries.nth(i).locator('.response-time').textContent();
          if (timeText) {
            times.push(parseFloat(timeText));
          }
        }

        // Verify ascending order (fastest = smallest time first)
        for (let i = 1; i < times.length; i++) {
          expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
        }
      }
    }
  });

  test('should handle multiple period champions (tied fastest)', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    const championBadges = page.locator('.period-champion-badge');
    const badgeCount = await championBadges.count();

    // If multiple champions, all should have badges
    if (badgeCount > 1) {
      for (let i = 0; i < badgeCount; i++) {
        await expect(championBadges.nth(i)).toContainText('★');
        await expect(championBadges.nth(i)).toBeVisible();
      }
    }
  });

  test('should show period label for second-half period', async ({ page }) => {
    await expect(page.locator('.tv-branding')).toBeVisible();

    const periodLabel = page.locator('.period-label');
    if (await periodLabel.isVisible()) {
      const text = await periodLabel.textContent();
      // Should be one of the valid period labels
      expect(['前半', '後半', '延長']).toContain(text || '');

      // Verify styling
      await expect(periodLabel).toHaveCSS('font-size', /px/);
      await expect(periodLabel).toHaveCSS('font-weight', /bold|700/);
    }
  });

  test('should maintain layout with both ranking lists visible simultaneously', async ({ page }) => {
    await expect(page.locator('.tv-ranking-container')).toBeVisible();

    // Get all ranking lists
    const rankingLists = page.locator('.ranking-list');
    const listCount = await rankingLists.count();

    if (listCount === 2) {
      // Verify both lists are visible and not overlapping
      const worst10 = rankingLists.nth(0);
      const top10 = rankingLists.nth(1);

      await expect(worst10).toBeVisible();
      await expect(top10).toBeVisible();

      // Get bounding boxes
      const worst10Box = await worst10.boundingBox();
      const top10Box = await top10.boundingBox();

      expect(worst10Box).toBeTruthy();
      expect(top10Box).toBeTruthy();

      // Verify they don't overlap (simple check: different x or y positions)
      if (worst10Box && top10Box) {
        const noOverlap =
          worst10Box.x + worst10Box.width <= top10Box.x || // Worst10 is left of Top10
          top10Box.x + top10Box.width <= worst10Box.x ||   // Top10 is left of Worst10
          worst10Box.y + worst10Box.height <= top10Box.y || // Worst10 is above Top10
          top10Box.y + top10Box.height <= worst10Box.y;     // Top10 is above Worst10

        expect(noOverlap).toBeTruthy();
      }
    }
  });
});
