/**
 * HealthChecker - Poll health endpoints until apps are ready
 * Feature: 008-e2e-playwright-tests
 *
 * Uses exponential backoff for efficient health checking
 */

export interface HealthCheckConfig {
  /** URL to check (e.g., "http://localhost:3000/health") */
  url: string;

  /** Maximum time to wait for health check to pass (default: 30000) */
  timeoutMs?: number;

  /** Initial polling interval in ms (default: 100) */
  initialIntervalMs?: number;

  /** Maximum polling interval in ms (default: 2000) */
  maxIntervalMs?: number;

  /** HTTP timeout for each individual request (default: 1000) */
  requestTimeoutMs?: number;
}

export class HealthChecker {
  /**
   * Wait for a health endpoint to return HTTP 200
   * Uses exponential backoff for polling
   * @param config - Health check configuration
   * @throws Error if health check doesn't pass within timeout
   */
  async waitForReady(config: HealthCheckConfig): Promise<void> {
    const {
      url,
      timeoutMs = 30000,
      initialIntervalMs = 100,
      maxIntervalMs = 2000,
      requestTimeoutMs = 1000,
    } = config;

    const startTime = Date.now();
    let delay = initialIntervalMs;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          return; // Success!
        }
      } catch (error) {
        // Connection refused or timeout - app not ready yet
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * 2, maxIntervalMs);
    }

    throw new Error(
      `App at ${url} not ready within ${timeoutMs}ms. Ensure the app is running and /health endpoint is accessible.`
    );
  }

  /**
   * Wait for multiple health endpoints to be ready in parallel
   * @param configs - Array of health check configurations
   * @returns void if all pass, throws Error with details of first failure
   */
  async waitForMany(configs: HealthCheckConfig[]): Promise<void> {
    await Promise.all(configs.map((config) => this.waitForReady(config)));
  }

  /**
   * Check health endpoint once (no retry)
   * @param url - Health endpoint URL
   * @param timeoutMs - Request timeout (default: 1000)
   * @returns true if healthy (HTTP 200), false otherwise
   */
  async checkOnce(url: string, timeoutMs: number = 1000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
