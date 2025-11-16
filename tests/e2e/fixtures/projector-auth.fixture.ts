import { test as base, Page } from '@playwright/test';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreSeeder } from '../helpers/firestore-seeder';
import { ProjectorPage } from '../page-objects/ProjectorPage';
import { NetworkSimulator } from '../helpers/network-simulation';
import { MetricsCollector } from '../helpers/metrics-collector';

/**
 * Custom fixtures for projector authentication E2E tests
 */
export interface ProjectorAuthFixture {
  /** Firebase test environment with emulator connection */
  testEnv: RulesTestEnvironment;

  /** Firestore instance connected to emulator */
  firestore: Firestore;

  /** Helper for seeding test data */
  seeder: FirestoreSeeder;

  /** Playwright page with projector app loaded */
  projectorPage: ProjectorPage;

  /** Network condition simulator for testing reconnection and fallback */
  networkSimulator: NetworkSimulator;

  /** Performance metrics collector for validation */
  metricsCollector: MetricsCollector;
}

/**
 * Extend Playwright's base test with custom fixtures
 *
 * Provides automatic setup and cleanup for Firebase Emulators,
 * test data seeding, and page object initialization.
 */
export const test = base.extend<ProjectorAuthFixture>({
  /**
   * Firebase test environment fixture
   * Initializes connection to Firestore Emulator
   */
  testEnv: async ({}, use) => {
    const env = await initializeTestEnvironment({
      projectId: 'demo-test-project',
      firestore: {
        host: 'localhost',
        port: 8080,
        rules: '/* Allow all for testing */'
      }
    });

    await use(env);

    // Cleanup: Close connection
    await env.cleanup();
  },

  /**
   * Firestore instance fixture
   * Provides type-safe Firestore access
   */
  firestore: async ({ testEnv }, use) => {
    const db = testEnv.context().firestore() as Firestore;
    await use(db);
  },

  /**
   * Test data seeder fixture
   * Provides helper for populating test data
   * Automatically clears data before and after each test
   */
  seeder: async ({ firestore }, use) => {
    const seeder = new FirestoreSeeder(firestore);

    // Clear before test
    await seeder.clearAll();

    await use(seeder);

    // Clear after test
    await seeder.clearAll();
  },

  /**
   * Projector page fixture
   * Provides page object with automatic navigation and initial data setup
   */
  projectorPage: async ({ page, seeder }, use) => {
    // Seed minimum required data for app initialization
    await seeder.seedGameState({
      currentPhase: 'waiting',
      isActive: false
    });

    // Create page object
    const projectorPage = new ProjectorPage(page);

    // Navigate to projector app
    await projectorPage.goto();

    await use(projectorPage);
  },

  /**
   * Network simulator fixture
   * Provides helpers for testing network conditions and reconnection
   */
  networkSimulator: async ({ page }, use) => {
    const simulator = new NetworkSimulator(page, 'http://localhost:3001');
    await use(simulator);

    // Cleanup: Restore online state
    await simulator.setState('online' as any); // Reset to online for next test
  },

  /**
   * Metrics collector fixture
   * Provides helpers for collecting performance metrics
   */
  metricsCollector: async ({ page }, use) => {
    const collector = new MetricsCollector(page);
    await use(collector);
  }
});

/**
 * Re-export expect for test files
 */
export { expect } from '@playwright/test';
