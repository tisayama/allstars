/**
 * Browser helper utilities for multi-context testing
 * Feature: 001-system-e2e-tests
 *
 * Provides utilities for managing multiple browser contexts and pages
 * to simulate multiple apps/users interacting simultaneously
 */

import { Browser, BrowserContext, Page } from '@playwright/test';

export interface MultiContextConfig {
  /** Number of contexts to create */
  count: number;

  /** Base URL for navigation (default: http://work-ubuntu) */
  baseURL?: string;

  /** Whether to record video (default: false) */
  recordVideo?: boolean;

  /** Context names for debugging */
  names?: string[];
}

/**
 * Create multiple browser contexts for simulating concurrent users
 * @param browser - Playwright browser instance
 * @param config - Multi-context configuration
 * @returns Array of browser contexts
 */
export async function createMultiContext(
  browser: Browser,
  config: MultiContextConfig
): Promise<BrowserContext[]> {
  const { count, baseURL = 'http://work-ubuntu', recordVideo = false, names = [] } = config;

  const contexts: BrowserContext[] = [];

  for (let i = 0; i < count; i++) {
    const context = await browser.newContext({
      baseURL,
      recordVideo: recordVideo ? { dir: `test-results/videos/context-${i}` } : undefined,
    });

    // Set context name for debugging
    if (names[i]) {
      (context as any)._debugName = names[i];
    }

    contexts.push(context);
  }

  return contexts;
}

/**
 * Navigate with retry logic to handle transient failures
 * @param page - Playwright page instance
 * @param url - URL to navigate to
 * @param options - Navigation options
 * @returns true if navigation succeeds, false otherwise
 */
export async function navigateWithRetry(
  page: Page,
  url: string,
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
    timeout?: number;
  } = {}
): Promise<boolean> {
  const { maxRetries = 3, retryDelayMs = 1000, timeout = 30000 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await page.goto(url, { timeout, waitUntil: 'networkidle' });
      return true;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Navigation to ${url} failed after ${maxRetries} attempts: ${error}`);
        return false;
      }

      console.warn(`Navigation attempt ${attempt + 1} failed, retrying in ${retryDelayMs}ms...`);
      await page.waitForTimeout(retryDelayMs);
    }
  }

  return false;
}

/**
 * Wait for Socket.IO connection to establish
 * @param page - Playwright page instance
 * @param timeoutMs - Maximum time to wait (default: 10000)
 * @returns true if socket connected, false if timeout
 */
export async function waitForSocketConnection(
  page: Page,
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    // Wait for socket.io connection event in page context
    await page.waitForFunction(
      () => {
        // Check if socket.io client is loaded and connected
        const socketClient = (window as any).io;
        if (!socketClient) return false;

        // Check for active socket connection
        const socket = (window as any).socket;
        return socket && socket.connected === true;
      },
      { timeout: timeoutMs }
    );

    return true;
  } catch (error) {
    console.error(`Socket connection not established within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Wait for specific element to be visible with retry
 * @param page - Playwright page instance
 * @param selector - Element selector
 * @param timeoutMs - Maximum time to wait (default: 5000)
 * @returns true if element found, false otherwise
 */
export async function waitForElementVisible(
  page: Page,
  selector: string,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
    return true;
  } catch (error) {
    console.error(`Element ${selector} not visible within ${timeoutMs}ms`);
    return false;
  }
}

/**
 * Close multiple browser contexts gracefully
 * @param contexts - Array of browser contexts to close
 */
export async function closeMultiContext(contexts: BrowserContext[]): Promise<void> {
  await Promise.allSettled(contexts.map(ctx => ctx.close()));
}

/**
 * Take screenshots of all pages in context
 * @param context - Browser context
 * @param basePath - Base path for screenshots (e.g., "test-results/debug")
 * @returns Array of screenshot paths
 */
export async function screenshotAllPages(
  context: BrowserContext,
  basePath: string
): Promise<string[]> {
  const pages = context.pages();
  const paths: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const path = `${basePath}-page-${i}.png`;
    await pages[i].screenshot({ path, fullPage: true });
    paths.push(path);
  }

  return paths;
}

/**
 * Execute function in multiple page contexts concurrently
 * @param pages - Array of pages
 * @param fn - Function to execute in each page
 * @returns Array of results from each page
 */
export async function executeInAllPages<T>(
  pages: Page[],
  fn: (page: Page, index: number) => Promise<T>
): Promise<T[]> {
  return Promise.all(pages.map((page, index) => fn(page, index)));
}

/**
 * Wait for all pages to reach a specific state
 * @param pages - Array of pages
 * @param checkFn - Function to check page state
 * @param timeoutMs - Maximum time to wait (default: 10000)
 * @returns true if all pages reach state, false otherwise
 */
export async function waitForAllPages(
  pages: Page[],
  checkFn: (page: Page) => Promise<boolean>,
  timeoutMs: number = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const results = await Promise.all(pages.map(page => checkFn(page)));

    if (results.every(result => result === true)) {
      return true;
    }

    // Wait a bit before checking again
    await pages[0].waitForTimeout(100);
  }

  return false;
}
