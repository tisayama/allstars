/**
 * Page Object Model: ParticipantPage
 *
 * Encapsulates all interactions with the participant-app UI.
 * Uses data-testid attributes for reliable element selection.
 *
 * URL: http://work-ubuntu:5173
 *
 * Key Responsibilities:
 * - Joining the game
 * - Viewing questions
 * - Selecting and submitting answers
 * - Receiving feedback on answers
 * - Handling timer states
 */

import { Page, Locator } from '@playwright/test';

export class ParticipantPage {
  // Page reference
  private page: Page;

  // Base URL (work-ubuntu hostname)
  private readonly baseUrl = 'http://work-ubuntu:5173';

  // Locators (using data-testid for reliability)
  private readonly nameInput: Locator;
  private readonly joinButton: Locator;
  private readonly waitingScreen: Locator;
  private readonly waitingMessage: Locator;
  private readonly questionContainer: Locator;
  private readonly questionText: Locator;
  private readonly answerOptionsContainer: Locator;
  private readonly submitButton: Locator;
  private readonly submissionConfirmation: Locator;
  private readonly submissionMessage: Locator;
  private readonly timerDisplay: Locator;
  private readonly timeUpMessage: Locator;
  private readonly feedbackContainer: Locator;
  private readonly feedbackMessage: Locator;
  private readonly correctAnswerDisplay: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.nameInput = page.locator('[data-testid="participant-name-input"]');
    this.joinButton = page.locator('[data-testid="join-button"]');
    this.waitingScreen = page.locator('[data-testid="waiting-screen"]');
    this.waitingMessage = page.locator('[data-testid="waiting-message"]');
    this.questionContainer = page.locator('[data-testid="question-container"]');
    this.questionText = page.locator('[data-testid="question-text"]');
    this.answerOptionsContainer = page.locator('[data-testid="answer-options"]');
    this.submitButton = page.locator('[data-testid="submit-answer-button"]');
    this.submissionConfirmation = page.locator('[data-testid="submission-confirmation"]');
    this.submissionMessage = page.locator('[data-testid="submission-message"]');
    this.timerDisplay = page.locator('[data-testid="timer-display"]');
    this.timeUpMessage = page.locator('[data-testid="time-up-message"]');
    this.feedbackContainer = page.locator('[data-testid="feedback-container"]');
    this.feedbackMessage = page.locator('[data-testid="feedback-message"]');
    this.correctAnswerDisplay = page.locator('[data-testid="correct-answer-display"]');
  }

  /**
   * Navigate to participant-app
   */
  async navigateTo(): Promise<void> {
    await this.page.goto(this.baseUrl);
    await this.waitForReady();
  }

  /**
   * Enter participant name in the input field
   */
  async enterName(name: string): Promise<void> {
    await this.nameInput.waitFor({ state: 'visible' });
    await this.nameInput.fill(name);
  }

  /**
   * Click the join button
   */
  async clickJoin(): Promise<void> {
    await this.joinButton.waitFor({ state: 'visible' });
    await this.joinButton.click();
  }

  /**
   * Convenience method: Join as participant (enter name + click join)
   */
  async joinAsParticipant(name: string): Promise<void> {
    await this.enterName(name);
    await this.clickJoin();
    await this.waitForWaitingScreen();
  }

  /**
   * Wait for waiting screen to appear
   */
  async waitForWaitingScreen(): Promise<void> {
    await this.waitingScreen.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if participant is on the waiting screen
   */
  async isOnWaitingScreen(): Promise<boolean> {
    try {
      await this.waitingScreen.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the waiting screen message
   */
  async getWaitingMessage(): Promise<string> {
    await this.waitingMessage.waitFor({ state: 'visible' });
    return await this.waitingMessage.textContent() || '';
  }

  /**
   * Get the current question text
   */
  async getQuestionText(): Promise<string> {
    await this.questionText.waitFor({ state: 'visible' });
    return await this.questionText.textContent() || '';
  }

  /**
   * Check if answer options are displayed
   */
  async hasAnswerOptions(): Promise<boolean> {
    try {
      await this.answerOptionsContainer.waitFor({ state: 'visible', timeout: 2000 });
      const options = await this.page.locator('[data-testid^="answer-option-"]').count();
      return options === 4;
    } catch {
      return false;
    }
  }

  /**
   * Check if participant can select an answer
   */
  async canSelectAnswer(): Promise<boolean> {
    try {
      const firstOption = this.page.locator('[data-testid="answer-option-A"]');
      await firstOption.waitFor({ state: 'visible', timeout: 2000 });
      return await firstOption.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Select an answer (A, B, C, or D)
   */
  async selectAnswer(answer: 'A' | 'B' | 'C' | 'D'): Promise<void> {
    const optionLocator = this.page.locator(`[data-testid="answer-option-${answer}"]`);
    await optionLocator.waitFor({ state: 'visible' });
    await optionLocator.click();
  }

  /**
   * Submit the selected answer
   */
  async submitAnswer(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
    await this.submitButton.click();
  }

  /**
   * Check if submission confirmation is displayed
   */
  async hasSubmissionConfirmation(): Promise<boolean> {
    try {
      await this.submissionConfirmation.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the submission confirmation message
   */
  async getSubmissionMessage(): Promise<string> {
    await this.submissionMessage.waitFor({ state: 'visible' });
    return await this.submissionMessage.textContent() || '';
  }

  /**
   * Wait for timer to expire
   */
  async waitForTimerExpiry(): Promise<void> {
    await this.timeUpMessage.waitFor({ state: 'visible', timeout: 35000 }); // Max 30s + 5s buffer
  }

  /**
   * Check if time up message is displayed
   */
  async hasTimeUpMessage(): Promise<boolean> {
    try {
      await this.timeUpMessage.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if participant can submit answer
   */
  async canSubmitAnswer(): Promise<boolean> {
    try {
      await this.submitButton.waitFor({ state: 'visible', timeout: 2000 });
      return await this.submitButton.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Check if feedback is displayed
   */
  async hasFeedback(): Promise<boolean> {
    try {
      await this.feedbackContainer.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the feedback type (correct or incorrect)
   */
  async getFeedbackType(): Promise<'correct' | 'incorrect' | 'unknown'> {
    await this.feedbackContainer.waitFor({ state: 'visible' });
    const feedbackClass = await this.feedbackContainer.getAttribute('data-feedback-type');

    if (feedbackClass === 'correct') return 'correct';
    if (feedbackClass === 'incorrect') return 'incorrect';
    return 'unknown';
  }

  /**
   * Get the feedback message
   */
  async getFeedbackMessage(): Promise<string> {
    await this.feedbackMessage.waitFor({ state: 'visible' });
    return await this.feedbackMessage.textContent() || '';
  }

  /**
   * Get the correct answer display
   */
  async getCorrectAnswerDisplay(): Promise<string> {
    await this.correctAnswerDisplay.waitFor({ state: 'visible' });
    return await this.correctAnswerDisplay.textContent() || '';
  }

  /**
   * Get the current timer value
   */
  async getTimerValue(): Promise<number> {
    await this.timerDisplay.waitFor({ state: 'visible' });
    const timerText = await this.timerDisplay.textContent() || '0';
    return parseInt(timerText, 10);
  }

  /**
   * Wait for participant-app to be ready
   */
  async waitForReady(): Promise<void> {
    // Wait for the app container to be visible
    await this.page.waitForSelector('[data-testid="participant-app"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Utility: Get all answer options text
   */
  async getAnswerOptionsText(): Promise<string[]> {
    const options = await this.page.locator('[data-testid^="answer-option-"]').all();
    const texts: string[] = [];

    for (const option of options) {
      const text = await option.textContent();
      if (text) texts.push(text);
    }

    return texts;
  }

  /**
   * Utility: Check if a specific answer option is selected
   */
  async isAnswerSelected(answer: 'A' | 'B' | 'C' | 'D'): Promise<boolean> {
    const optionLocator = this.page.locator(`[data-testid="answer-option-${answer}"]`);
    const isSelected = await optionLocator.getAttribute('data-selected');
    return isSelected === 'true';
  }

  /**
   * Utility: Get currently selected answer
   */
  async getSelectedAnswer(): Promise<'A' | 'B' | 'C' | 'D' | null> {
    const answers: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

    for (const answer of answers) {
      if (await this.isAnswerSelected(answer)) {
        return answer;
      }
    }

    return null;
  }
}
