/**
 * Wait helper utilities for game state and events
 * Feature: 001-system-e2e-tests
 *
 * Provides specialized waiting functions for AllStars game states,
 * participant events, and question display synchronization
 */

import { Page } from '@playwright/test';
import type { GamePhase } from '@allstars/types';

export interface WaitOptions {
  /** Maximum time to wait in milliseconds (default: 5000) */
  timeoutMs?: number;

  /** Polling interval in milliseconds (default: 100) */
  pollingMs?: number;
}

/**
 * Wait for game state to reach a specific phase
 * @param page - Playwright page instance
 * @param expectedPhase - Expected game phase
 * @param options - Wait options
 * @returns true if phase reached, false if timeout
 */
export async function waitForGameState(
  page: Page,
  expectedPhase: GamePhase,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000, pollingMs = 100 } = options;

  try {
    await page.waitForFunction(
      (phase) => {
        // Check game state in page context
        const gameState = (window as any).gameState;
        return gameState && gameState.currentPhase === phase;
      },
      expectedPhase,
      { timeout: timeoutMs, polling: pollingMs }
    );

    return true;
  } catch (error) {
    console.error(`Game state did not reach "${expectedPhase}" within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for participant to join the game
 * @param page - Playwright page instance (host or projector)
 * @param participantName - Expected participant name
 * @param options - Wait options
 * @returns true if participant joined, false if timeout
 */
export async function waitForParticipantJoin(
  page: Page,
  participantName: string,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000, pollingMs = 100 } = options;

  try {
    await page.waitForFunction(
      (name) => {
        // Check participants list in page context
        const participants = (window as any).participants || [];
        return participants.some((p: any) => p.name === name);
      },
      participantName,
      { timeout: timeoutMs, polling: pollingMs }
    );

    return true;
  } catch (error) {
    console.error(`Participant "${participantName}" did not join within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for question to be displayed on page
 * @param page - Playwright page instance
 * @param questionText - Expected question text (or partial match)
 * @param options - Wait options
 * @returns true if question displayed, false if timeout
 */
export async function waitForQuestionDisplay(
  page: Page,
  questionText: string,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000 } = options;

  try {
    // Wait for question text to appear in DOM
    await page.waitForSelector(`text="${questionText}"`, {
      state: 'visible',
      timeout: timeoutMs,
    });

    return true;
  } catch (error) {
    console.error(`Question "${questionText}" not displayed within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for answer options to be clickable
 * @param page - Playwright page instance
 * @param options - Wait options
 * @returns true if options clickable, false if timeout
 */
export async function waitForAnswerOptions(
  page: Page,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000 } = options;

  try {
    // Wait for at least one answer button to be enabled and visible
    await page.waitForSelector('button[data-choice]:not([disabled])', {
      state: 'visible',
      timeout: timeoutMs,
    });

    return true;
  } catch (error) {
    console.error(`Answer options not clickable within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for ranking results to be displayed
 * @param page - Playwright page instance (projector or host)
 * @param options - Wait options
 * @returns true if rankings displayed, false if timeout
 */
export async function waitForRankingsDisplay(
  page: Page,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000 } = options;

  try {
    // Wait for rankings container to be visible
    await page.waitForSelector('[data-testid="rankings"]', {
      state: 'visible',
      timeout: timeoutMs,
    });

    return true;
  } catch (error) {
    console.error(`Rankings not displayed within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for correct answer reveal
 * @param page - Playwright page instance
 * @param correctAnswer - Expected correct answer text
 * @param options - Wait options
 * @returns true if correct answer revealed, false if timeout
 */
export async function waitForCorrectAnswerReveal(
  page: Page,
  correctAnswer: string,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000 } = options;

  try {
    // Wait for correct answer indicator to be visible
    await page.waitForSelector(`[data-correct="true"]:has-text("${correctAnswer}")`, {
      state: 'visible',
      timeout: timeoutMs,
    });

    return true;
  } catch (error) {
    console.error(`Correct answer "${correctAnswer}" not revealed within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for timer to reach specific value
 * @param page - Playwright page instance
 * @param secondsRemaining - Expected seconds remaining
 * @param options - Wait options
 * @returns true if timer reached value, false if timeout
 */
export async function waitForTimerValue(
  page: Page,
  secondsRemaining: number,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000, pollingMs = 100 } = options;

  try {
    await page.waitForFunction(
      (expectedSeconds) => {
        const timerElement = document.querySelector('[data-testid="timer"]');
        if (!timerElement) return false;

        const currentSeconds = parseInt(timerElement.textContent || '0', 10);
        return currentSeconds <= expectedSeconds;
      },
      secondsRemaining,
      { timeout: timeoutMs, polling: pollingMs }
    );

    return true;
  } catch (error) {
    console.error(`Timer did not reach ${secondsRemaining}s within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for participant count to reach expected value
 * @param page - Playwright page instance
 * @param expectedCount - Expected number of participants
 * @param options - Wait options
 * @returns true if count reached, false if timeout
 */
export async function waitForParticipantCount(
  page: Page,
  expectedCount: number,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000, pollingMs = 100 } = options;

  try {
    await page.waitForFunction(
      (count) => {
        const participants = (window as any).participants || [];
        return participants.length >= count;
      },
      expectedCount,
      { timeout: timeoutMs, polling: pollingMs }
    );

    return true;
  } catch (error) {
    console.error(`Participant count did not reach ${expectedCount} within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for gong sound/animation to activate
 * @param page - Playwright page instance (projector)
 * @param options - Wait options
 * @returns true if gong activated, false if timeout
 */
export async function waitForGongActivation(
  page: Page,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 5000 } = options;

  try {
    await page.waitForSelector('[data-testid="gong-active"]', {
      state: 'visible',
      timeout: timeoutMs,
    });

    return true;
  } catch (error) {
    console.error(`Gong did not activate within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for all participants to submit answers
 * @param page - Playwright page instance (host)
 * @param expectedCount - Expected number of submissions
 * @param options - Wait options
 * @returns true if all submitted, false if timeout
 */
export async function waitForAllSubmissions(
  page: Page,
  expectedCount: number,
  options: WaitOptions = {}
): Promise<boolean> {
  const { timeoutMs = 30000, pollingMs = 100 } = options;

  try {
    await page.waitForFunction(
      (count) => {
        const submissions = (window as any).answerSubmissions || [];
        return submissions.length >= count;
      },
      expectedCount,
      { timeout: timeoutMs, polling: pollingMs }
    );

    return true;
  } catch (error) {
    console.error(`Did not receive ${expectedCount} submissions within ${timeoutMs}ms`);
    return false;
  }
}
