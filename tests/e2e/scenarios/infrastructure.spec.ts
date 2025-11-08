/**
 * E2E Test Suite: Test Infrastructure and Automation
 *
 * User Story 5 (P2): As a developer, I need a single command to run all E2E tests
 * including emulator setup and teardown, so that I can validate system functionality
 * quickly and reliably.
 *
 * This test suite validates the E2E testing infrastructure itself:
 * - Firebase Emulator Suite automatic startup
 * - All 4 apps starting on work-ubuntu hostname
 * - Tests using work-ubuntu (not localhost)
 * - Automatic shutdown and cleanup
 * - HTML report generation
 * - Screenshot and log capture
 *
 * All tests use work-ubuntu hostname and collection prefix isolation.
 */

import { test, expect } from '../fixtures';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

test.describe('Test Infrastructure and Automation', () => {
  /**
   * INF1: Firebase Emulator Suite Starts Automatically
   *
   * Given: developer has the project cloned
   * When: they run \`pnpm run e2e\`
   * Then: Firebase Emulator Suite starts automatically
   */
  test('INF1: Firebase Emulator Suite starts automatically via globalSetup', async () => {
    // NOTE: This test validates that globalSetup successfully started the emulators
    // The emulators should already be running when this test executes

    // Verify Firestore emulator is accessible
    const firestoreUrl = 'http://localhost:8080';
    const firestoreResponse = await fetch(firestoreUrl);
    expect(firestoreResponse.ok).toBe(true);

    // Verify Auth emulator is accessible
    const authUrl = 'http://localhost:9099';
    const authResponse = await fetch(authUrl);
    expect(authResponse.ok).toBe(true);

    // Verify emulator processes are running
    const { stdout } = await execAsync('lsof -i :8080 -i :9099');
    expect(stdout).toContain('8080');
    expect(stdout).toContain('9099');
  });

  /**
   * INF2: All 4 Apps Start on work-ubuntu Hostname
   *
   * Given: Firebase Emulator Suite is starting
   * When: emulators are ready
   * Then: all four apps (admin, participant, projector, host) start on work-ubuntu hostname
   */
  test('INF2: All 4 apps start on work-ubuntu hostname', async () => {
    // NOTE: This test validates that globalSetup successfully started all 4 apps
    // The apps should already be running when this test executes

    const appUrls = [
      { name: 'participant-app', url: 'http://work-ubuntu:5173' },
      { name: 'host-app', url: 'http://work-ubuntu:5174' },
      { name: 'projector-app', url: 'http://work-ubuntu:5175' },
      { name: 'admin-app', url: 'http://work-ubuntu:5176' },
    ];

    // Verify each app is accessible
    for (const app of appUrls) {
      try {
        const response = await fetch(app.url, { redirect: 'manual' });
        // Accept 200 (OK) or 3xx (redirect) as success
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(400);
      } catch (error) {
        throw new Error(`${app.name} not accessible at ${app.url}: ${error}`);
      }
    }

    // Verify apps are running on correct ports
    const { stdout } = await execAsync('lsof -i :5173 -i :5174 -i :5175 -i :5176');
    expect(stdout).toContain('5173'); // participant-app
    expect(stdout).toContain('5174'); // host-app
    expect(stdout).toContain('5175'); // projector-app
    expect(stdout).toContain('5176'); // admin-app
  });

  /**
   * INF3: Tests Interact with Apps Using work-ubuntu Hostname
   *
   * Given: all apps are running
   * When: E2E tests execute
   * Then: tests interact with apps using work-ubuntu hostname (not localhost)
   */
  test('INF3: Tests use work-ubuntu hostname not localhost', async ({ page }) => {
    // Verify Playwright config uses work-ubuntu
    const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');
    const configContent = await fs.readFile(playwrightConfigPath, 'utf-8');
    expect(configContent).toContain('work-ubuntu');

    // Verify page can navigate to work-ubuntu URLs
    await page.goto('http://work-ubuntu:5173');
    expect(page.url()).toContain('work-ubuntu');
    expect(page.url()).not.toContain('localhost');

    // Verify test fixtures use work-ubuntu
    const fixturesPath = path.join(process.cwd(), 'tests/e2e/fixtures.ts');
    const fixturesContent = await fs.readFile(fixturesPath, 'utf-8');
    // Fixtures should not hardcode localhost URLs
    expect(fixturesContent).not.toContain('http://localhost');

    // Verify page object models use work-ubuntu
    const pageObjectsDir = path.join(process.cwd(), 'tests/e2e/helpers/page-objects');
    const pageObjectFiles = await fs.readdir(pageObjectsDir);

    for (const file of pageObjectFiles) {
      if (file.endsWith('.ts')) {
        const filePath = path.join(pageObjectsDir, file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        expect(fileContent).toContain('work-ubuntu');
        // Should not use localhost
        const localhostMatches = fileContent.match(/http:\/\/localhost/g);
        expect(localhostMatches).toBeNull();
      }
    }
  });

  /**
   * INF4: Emulators and Apps Shut Down Automatically After Tests
   *
   * Given: E2E tests are running
   * When: tests complete (pass or fail)
   * Then: all emulators and apps shut down automatically
   *
   * NOTE: This test cannot fully verify automatic shutdown because
   * it runs DURING the test suite. The actual cleanup happens in globalTeardown.
   * Instead, we verify that the cleanup mechanisms are in place.
   */
  test('INF4: Emulators and apps have automatic shutdown mechanisms', async () => {
    // Verify globalTeardown exists
    const globalTeardownPath = path.join(process.cwd(), 'tests/e2e/globalTeardown.ts');
    const teardownExists = await fs
      .access(globalTeardownPath)
      .then(() => true)
      .catch(() => false);
    expect(teardownExists).toBe(true);

    // Verify globalTeardown contains shutdown logic
    const teardownContent = await fs.readFile(globalTeardownPath, 'utf-8');
    expect(teardownContent).toContain('stop'); // Should stop processes
    expect(teardownContent).toContain('emulator'); // Should stop emulators

    // Verify EmulatorManager has stop method
    const emulatorManagerPath = path.join(
      process.cwd(),
      'tests/e2e/setup/emulator-manager.ts'
    );
    const emulatorContent = await fs.readFile(emulatorManagerPath, 'utf-8');
    expect(emulatorContent).toContain('async stop');
    expect(emulatorContent).toContain('timeout'); // Should use timeout

    // Verify AppLauncher has stop method
    const appLauncherPath = path.join(process.cwd(), 'tests/e2e/setup/app-launcher.ts');
    const appLauncherContent = await fs.readFile(appLauncherPath, 'utf-8');
    expect(appLauncherContent).toContain('async stop');
    expect(appLauncherContent).toContain('timeout'); // Should use timeout
  });

  /**
   * INF5: HTML Report Shows Clear Pass/Fail Status
   *
   * Given: E2E tests have completed
   * When: viewing test results
   * Then: clear pass/fail status and error details are shown
   */
  test('INF5: HTML report configuration includes pass/fail status', async () => {
    // Verify Playwright config has HTML reporter
    const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');
    const configContent = await fs.readFile(playwrightConfigPath, 'utf-8');
    expect(configContent).toContain('reporter');
    expect(configContent).toContain('html');

    // Verify HTML report directory is configured
    const hasReportConfig =
      configContent.includes('playwright-report') || configContent.includes("reporter: 'html'");
    expect(hasReportConfig).toBe(true);

    // Verify .gitignore excludes HTML reports
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('playwright-report');
  });

  /**
   * INF6: Screenshots and Logs Available for Failures
   *
   * Given: a test fails
   * When: reviewing failure details
   * Then: screenshots and logs from the failure moment are available
   */
  test('INF6: Screenshot and trace configuration is enabled', async () => {
    // Verify Playwright config has screenshot on failure
    const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.ts');
    const configContent = await fs.readFile(playwrightConfigPath, 'utf-8');

    // Check for screenshot configuration
    const hasScreenshotConfig =
      configContent.includes('only-on-failure') || configContent.includes('screenshot');
    expect(hasScreenshotConfig).toBe(true);

    // Check for trace configuration
    const hasTraceConfig =
      configContent.includes('on-first-retry') ||
      configContent.includes('retain-on-failure') ||
      configContent.includes('trace');
    expect(hasTraceConfig).toBe(true);

    // Verify test-results directory is in .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('test-results');

    // Verify video configuration exists
    const hasVideoConfig =
      configContent.includes('retain-on-failure') || configContent.includes('video');
    expect(hasVideoConfig).toBe(true);
  });
});
