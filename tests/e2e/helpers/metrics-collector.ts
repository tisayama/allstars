import type { Page } from '@playwright/test';

/**
 * Authentication metrics collected during E2E tests
 */
export interface AuthMetrics {
  /** Time from page load to auth complete (ms) */
  authTime: number;
  /** Whether auth succeeded */
  authSuccess: boolean;
  /** Error message if auth failed */
  authError: string | null;
}

/**
 * WebSocket reconnection metrics
 */
export interface ReconnectionMetrics {
  /** Number of reconnection attempts before success */
  attemptCount: number;
  /** Delay between each attempt (ms) */
  attemptDelays: number[];
  /** Total time from disconnect to reconnect (ms) */
  totalTime: number;
  /** Whether reconnection succeeded */
  reconnectSuccess: boolean;
}

/**
 * Firestore fallback and deduplication metrics
 */
export interface FallbackMetrics {
  /** Time from WebSocket disconnect to Firestore update (ms) */
  fallbackLatency: number;
  /** Number of duplicate updates detected */
  duplicateCount: number;
  /** Total updates received */
  totalUpdates: number;
  /** Deduplication rate (0-1) */
  deduplicationRate: number;
}

/**
 * Helper class for collecting performance metrics during E2E tests
 *
 * Monitors console logs and page state to extract timing and
 * behavior metrics for validation against success criteria.
 */
export class MetricsCollector {
  private consoleLogs: string[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor(private page: Page) {
    this.setupConsoleListener();
    this.setupPerformanceTracking();
  }

  /**
   * Set up console log listener to capture debug messages
   */
  private setupConsoleListener(): void {
    this.page.on('console', msg => {
      this.consoleLogs.push(`[${Date.now()}] ${msg.text()}`);
    });
  }

  /**
   * Set up performance tracking API on the page
   */
  private setupPerformanceTracking(): void {
    this.page.evaluate(() => {
      // Expose performance API to test context
      (window as any).__PERFORMANCE__ = {
        mark: (name: string) => performance.mark(name),
        measure: (name: string, start: string, end: string) =>
          performance.measure(name, start, end)
      };
    });
  }

  /**
   * Collect authentication performance metrics
   */
  async collectAuthMetrics(): Promise<AuthMetrics> {
    const startTime = this.performanceMarks.get('page-load') || Date.now();

    const authCompleteTime = await this.page.evaluate(() => {
      return (window as any).__AUTH_COMPLETE_TIME__ || 0;
    });

    const authError = await this.page.evaluate(() => {
      return (window as any).__AUTH_ERROR__ || null;
    });

    return {
      authTime: authCompleteTime > 0 ? authCompleteTime - startTime : 0,
      authSuccess: authError === null,
      authError
    };
  }

  /**
   * Collect WebSocket reconnection metrics
   */
  async collectReconnectionMetrics(): Promise<ReconnectionMetrics> {
    const reconnectLogs = this.consoleLogs.filter(log =>
      log.includes('reconnection attempt')
    );

    const attemptTimes = reconnectLogs.map(log => {
      const match = log.match(/\[(\d+)\]/);
      return match ? parseInt(match[1], 10) : 0;
    }).filter(time => time > 0);

    const attemptDelays = attemptTimes.slice(1).map((time, i) =>
      time - attemptTimes[i]
    );

    const reconnectSuccess = this.consoleLogs.some(log =>
      log.includes('WebSocket reconnected')
    );

    return {
      attemptCount: attemptTimes.length,
      attemptDelays,
      totalTime: attemptTimes.length > 0
        ? attemptTimes[attemptTimes.length - 1] - attemptTimes[0]
        : 0,
      reconnectSuccess
    };
  }

  /**
   * Collect Firestore fallback and deduplication metrics
   */
  async collectFallbackMetrics(): Promise<FallbackMetrics> {
    const duplicateLogs = this.consoleLogs.filter(log =>
      log.includes('Deduplicating')
    );

    const totalUpdates = await this.page.evaluate(() => {
      return (window as any).__TOTAL_UPDATES__ || 0;
    });

    return {
      fallbackLatency: 0, // Measured separately in specific tests
      duplicateCount: duplicateLogs.length,
      totalUpdates,
      deduplicationRate: totalUpdates > 0
        ? duplicateLogs.length / totalUpdates
        : 0
    };
  }

  /**
   * Get all console logs collected so far
   */
  getConsoleLogs(): string[] {
    return [...this.consoleLogs];
  }

  /**
   * Get console logs matching a specific pattern
   */
  getConsoleLogsMatching(pattern: string | RegExp): string[] {
    if (typeof pattern === 'string') {
      return this.consoleLogs.filter(log => log.includes(pattern));
    } else {
      return this.consoleLogs.filter(log => pattern.test(log));
    }
  }

  /**
   * Clear all collected metrics (useful between test scenarios)
   */
  clear(): void {
    this.consoleLogs = [];
    this.performanceMarks.clear();
  }

  /**
   * Mark a performance timestamp for later measurement
   */
  mark(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  /**
   * Measure time between two marks
   */
  measure(startMark: string, endMark: string): number {
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark);

    if (!start || !end) {
      return 0;
    }

    return end - start;
  }
}
