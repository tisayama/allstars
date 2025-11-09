/**
 * Page Object Model: HostPage
 *
 * Encapsulates all interactions with the host-app UI.
 * Uses data-testid attributes for reliable element selection.
 *
 * URL: http://work-ubuntu:5175
 *
 * Key Responsibilities:
 * - Starting questions
 * - Revealing correct answers
 * - Showing rankings
 * - Activating final question mode
 * - Reviving eliminated participants
 * - Managing game phase transitions
 * - Viewing game state
 */

import { Page, Locator } from '@playwright/test';

export class HostPage {
  // Page reference
  private page: Page;

  // Base URL (work-ubuntu hostname)
  private readonly baseUrl = 'http://work-ubuntu:5175';

  // Locators (using data-testid for reliability)
  private readonly questionSelector: Locator;
  private readonly startQuestionButton: Locator;
  private readonly revealAnswerButton: Locator;
  private readonly showRankingsButton: Locator;
  private readonly finalQuestionCheckbox: Locator;
  private readonly reviveAllButton: Locator;
  private readonly currentPhaseDisplay: Locator;
  private readonly questionNumberDisplay: Locator;
  private readonly eliminatedCountDisplay: Locator;
  private readonly activeCountDisplay: Locator;
  private readonly gameStateContainer: Locator;
  private readonly participantListContainer: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.questionSelector = page.locator('[data-testid="question-selector"]');
    this.startQuestionButton = page.locator('[data-testid="start-question-button"]');
    this.revealAnswerButton = page.locator('[data-testid="reveal-answer-button"]');
    this.showRankingsButton = page.locator('[data-testid="show-rankings-button"]');
    this.finalQuestionCheckbox = page.locator('[data-testid="final-question-checkbox"]');
    this.reviveAllButton = page.locator('[data-testid="revive-all-button"]');
    this.currentPhaseDisplay = page.locator('[data-testid="current-phase"]');
    this.questionNumberDisplay = page.locator('[data-testid="question-number"]');
    this.eliminatedCountDisplay = page.locator('[data-testid="eliminated-count"]');
    this.activeCountDisplay = page.locator('[data-testid="active-count"]');
    this.gameStateContainer = page.locator('[data-testid="game-state-container"]');
    this.participantListContainer = page.locator('[data-testid="participant-list"]');
  }

  /**
   * Navigate to host-app
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.waitForReady();
  }

  /**
   * Select a question by its number (1-indexed)
   */
  async selectQuestion(questionNumber: number): Promise<void> {
    await this.questionSelector.waitFor({ state: 'visible' });
    await this.questionSelector.selectOption({ value: questionNumber.toString() });
  }

  /**
   * Click the "Start Question" button
   */
  async clickStartQuestion(): Promise<void> {
    await this.startQuestionButton.waitFor({ state: 'visible' });
    await this.startQuestionButton.click();
  }

  /**
   * Click the "Reveal Correct Answer" button
   */
  async clickRevealAnswer(): Promise<void> {
    await this.revealAnswerButton.waitFor({ state: 'visible' });
    await this.revealAnswerButton.click();
  }

  /**
   * Click the "Show Rankings" button
   */
  async clickShowRankings(): Promise<void> {
    await this.showRankingsButton.waitFor({ state: 'visible' });
    await this.showRankingsButton.click();
  }

  /**
   * Mark the current/selected question as the final question
   */
  async markAsFinalQuestion(): Promise<void> {
    await this.finalQuestionCheckbox.waitFor({ state: 'visible' });
    await this.finalQuestionCheckbox.check();
  }

  /**
   * Click the "Revive All" button to restore eliminated participants
   */
  async clickReviveAll(): Promise<void> {
    await this.reviveAllButton.waitFor({ state: 'visible' });
    await this.reviveAllButton.click();
  }

  /**
   * Get the current game phase
   */
  async getCurrentPhase(): Promise<string> {
    await this.currentPhaseDisplay.waitFor({ state: 'visible' });
    return await this.currentPhaseDisplay.getAttribute('data-phase') || '';
  }

  /**
   * Get the current question number
   */
  async getCurrentQuestionNumber(): Promise<number> {
    await this.questionNumberDisplay.waitFor({ state: 'visible' });
    const numberText = await this.questionNumberDisplay.textContent() || '0';
    return parseInt(numberText, 10);
  }

  /**
   * Get the number of eliminated participants
   */
  async getEliminatedCount(): Promise<number> {
    await this.eliminatedCountDisplay.waitFor({ state: 'visible' });
    const countText = await this.eliminatedCountDisplay.textContent() || '0';
    return parseInt(countText, 10);
  }

  /**
   * Get the number of active participants
   */
  async getActiveCount(): Promise<number> {
    await this.activeCountDisplay.waitFor({ state: 'visible' });
    const countText = await this.activeCountDisplay.textContent() || '0';
    return parseInt(countText, 10);
  }

  /**
   * Wait for host-app to be ready
   */
  async waitForReady(): Promise<void> {
    // Wait for the app container to be visible
    await this.page.waitForSelector('[data-testid="host-app"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Utility: Check if "Start Question" button is enabled
   */
  async canStartQuestion(): Promise<boolean> {
    try {
      await this.startQuestionButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.startQuestionButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Utility: Check if "Reveal Answer" button is enabled
   */
  async canRevealAnswer(): Promise<boolean> {
    try {
      await this.revealAnswerButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.revealAnswerButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Utility: Check if "Show Rankings" button is enabled
   */
  async canShowRankings(): Promise<boolean> {
    try {
      await this.showRankingsButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.showRankingsButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Utility: Check if "Revive All" button is enabled
   */
  async canReviveAll(): Promise<boolean> {
    try {
      await this.reviveAllButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.reviveAllButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Utility: Get all available questions
   */
  async getAvailableQuestions(): Promise<number> {
    await this.questionSelector.waitFor({ state: 'visible' });
    const options = await this.questionSelector.locator('option').all();
    return options.length;
  }

  /**
   * Utility: Get current selected question number
   */
  async getSelectedQuestionNumber(): Promise<number> {
    await this.questionSelector.waitFor({ state: 'visible' });
    const selectedValue = await this.questionSelector.inputValue();
    return parseInt(selectedValue, 10);
  }

  /**
   * Utility: Check if final question checkbox is checked
   */
  async isFinalQuestionMarked(): Promise<boolean> {
    await this.finalQuestionCheckbox.waitFor({ state: 'visible' });
    return await this.finalQuestionCheckbox.isChecked();
  }

  /**
   * Utility: Get list of all participants with status
   */
  async getParticipantList(): Promise<Array<{ name: string; status: string }>> {
    await this.participantListContainer.waitFor({ state: 'visible' });
    const participantElements = await this.page
      .locator('[data-testid^="participant-entry-"]')
      .all();

    const participants: Array<{ name: string; status: string }> = [];

    for (const element of participantElements) {
      const name = await element.locator('[data-testid="participant-name"]').textContent() || '';
      const status = await element.getAttribute('data-status') || 'unknown';
      participants.push({ name, status });
    }

    return participants;
  }

  /**
   * Utility: Get game state summary
   */
  async getGameStateSummary(): Promise<{
    phase: string;
    questionNumber: number;
    activeCount: number;
    eliminatedCount: number;
  }> {
    const phase = await this.getCurrentPhase();
    const questionNumber = await this.getCurrentQuestionNumber();
    const activeCount = await this.getActiveCount();
    const eliminatedCount = await this.getEliminatedCount();

    return {
      phase,
      questionNumber,
      activeCount,
      eliminatedCount,
    };
  }

  /**
   * Utility: Wait for phase to change
   */
  async waitForPhaseChange(expectedPhase: string, timeoutMs = 5000): Promise<void> {
    await this.page.waitForFunction(
      (phase) => {
        const phaseElement = document.querySelector('[data-testid="current-phase"]');
        return phaseElement?.getAttribute('data-phase') === phase;
      },
      expectedPhase,
      { timeout: timeoutMs }
    );
  }

  /**
   * Utility: Execute full phase transition (start → reveal → rankings)
   */
  async executeFullPhaseTransition(questionNumber: number): Promise<void> {
    // Select and start question
    await this.selectQuestion(questionNumber);
    await this.clickStartQuestion();
    await this.waitForPhaseChange('showing_question');

    // Reveal answer
    await this.clickRevealAnswer();
    await this.waitForPhaseChange('showing_correct_answer');

    // Show rankings
    await this.clickShowRankings();
    await this.waitForPhaseChange('showing_results');
  }
}
