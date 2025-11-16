import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the projector app
 *
 * Encapsulates all UI interactions and state queries for the projector app.
 * Provides a clean API for E2E tests to interact with the application.
 */
export class ProjectorPage {
  private readonly baseUrl = 'http://localhost:5175';

  // Locators for key UI elements
  private readonly authStatus: Locator;
  private readonly connectionStatus: Locator;
  private readonly questionText: Locator;
  private readonly phaseIndicator: Locator;
  private readonly errorMessage: Locator;

  constructor(public readonly page: Page) {
    this.authStatus = page.locator('[data-testid="auth-status"]');
    this.connectionStatus = page.locator('[data-testid="connection-status"]');
    this.questionText = page.locator('[data-testid="question-text"]');
    this.phaseIndicator = page.locator('[data-testid="phase-indicator"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  /**
   * Navigate to the projector app
   */
  async goto(): Promise<void> {
    await this.page.goto(this.baseUrl);
  }

  /**
   * Wait for authentication to complete
   * @param timeout Maximum time to wait in milliseconds (default: 3000ms)
   */
  async waitForAuthentication(timeout: number = 3000): Promise<void> {
    await this.authStatus.waitFor({ state: 'visible', timeout });
    await this.page.waitForFunction(() => {
      return (window as any).__AUTH_COMPLETE__ === true;
    }, { timeout });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return (window as any).__AUTH_COMPLETE__ === true;
    });
  }

  /**
   * Get the current Firebase user ID
   */
  async getUserId(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return (window as any).__USER_ID__ || null;
    });
  }

  /**
   * Check if WebSocket is connected
   */
  async isWebSocketConnected(): Promise<boolean> {
    const status = await this.connectionStatus.textContent();
    return status?.includes('connected') ?? false;
  }

  /**
   * Get current connection status text
   */
  async getConnectionStatus(): Promise<string> {
    return await this.connectionStatus.textContent() || '';
  }

  /**
   * Get current game phase
   */
  async getCurrentPhase(): Promise<string> {
    return await this.phaseIndicator.textContent() || '';
  }

  /**
   * Wait for specific game phase
   * @param phase Expected phase name
   * @param timeout Maximum time to wait (default: 5000ms)
   */
  async waitForPhase(phase: string, timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      (expectedPhase) => {
        const currentPhase = document.querySelector('[data-testid="phase-indicator"]')?.textContent;
        return currentPhase === expectedPhase;
      },
      phase,
      { timeout }
    );
  }

  /**
   * Get displayed question text
   */
  async getQuestionText(): Promise<string> {
    return await this.questionText.textContent() || '';
  }

  /**
   * Get error message if displayed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const isVisible = await this.errorMessage.isVisible({ timeout: 1000 });
      if (isVisible) {
        return await this.errorMessage.textContent();
      }
    } catch {
      // Error message not visible
    }
    return null;
  }

  /**
   * Wait for error message to appear
   */
  async waitForError(timeout: number = 5000): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout });
    return await this.errorMessage.textContent() || '';
  }

  /**
   * Check if page is currently loading
   */
  async isLoading(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return (window as any).__IS_LOADING__ === true;
    });
  }

  /**
   * Get authentication state (for state transition testing)
   */
  async getAuthState(): Promise<string> {
    return await this.page.evaluate(() => {
      return (window as any).__AUTH_STATE__ || 'unknown';
    });
  }

  /**
   * Reload the page (for session persistence testing)
   */
  async reload(): Promise<void> {
    await this.page.reload();
  }

  /**
   * Get the underlying Playwright page object
   * Useful for advanced operations not covered by page object
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * Wait for specific amount of time (use sparingly, prefer explicit waits)
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Check if element exists on page
   */
  async hasElement(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if page has specific text content
   */
  async hasText(text: string): Promise<boolean> {
    const content = await this.page.textContent('body');
    return content?.includes(text) ?? false;
  }

  /**
   * Wait for WebSocket connection to be established
   * @param timeout Maximum time to wait in milliseconds (default: 5000ms)
   */
  async waitForWebSocketConnection(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => {
        return (window as any).__WS_CONNECTED__ === true;
      },
      { timeout }
    );
  }

  /**
   * Get the current authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return await this.page.evaluate(() => {
      return (window as any).__AUTH_TOKEN__ || null;
    });
  }

  /**
   * Get console errors from the page
   */
  async getConsoleErrors(): Promise<string[]> {
    return await this.page.evaluate(() => {
      return (window as any).__CONSOLE_ERRORS__ || [];
    });
  }

  /**
   * Get network API calls matching a specific pattern
   * @param pattern URL pattern to match
   */
  async getNetworkCalls(pattern: string): Promise<Array<{ url: string; timestamp: number }>> {
    return await this.page.evaluate((urlPattern) => {
      return ((window as any).__NETWORK_CALLS__ || []).filter((call: any) =>
        call.url.includes(urlPattern)
      );
    }, pattern);
  }
}
