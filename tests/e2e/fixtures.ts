/**
 * Playwright custom fixtures for E2E tests
 * Feature: 008-e2e-playwright-tests
 *
 * Provides test-specific fixtures like collectionPrefix
 */

import { test as base } from '@playwright/test';
import { CollectionPrefixGenerator } from './helpers/collection-prefix';
import { TestDataSeeder } from './helpers/test-data-seeder';

// Extend base test with custom fixtures
export interface E2EFixtures {
  /** Unique collection prefix for this test run (for data isolation) */
  collectionPrefix: string;

  /** Test data seeder instance (pre-configured with Firebase Admin) */
  seeder: TestDataSeeder;

  /** Collection prefix generator instance */
  prefixGenerator: CollectionPrefixGenerator;
}

export const test = base.extend<E2EFixtures>({
  // Generate unique collection prefix for each test
  collectionPrefix: async ({}, use) => {
    const generator = new CollectionPrefixGenerator();
    const prefix = generator.generate();
    await use(prefix);
  },

  // Provide test data seeder instance
  seeder: async ({}, use) => {
    const seeder = new TestDataSeeder();
    await use(seeder);
  },

  // Provide prefix generator instance
  prefixGenerator: async ({}, use) => {
    const generator = new CollectionPrefixGenerator();
    await use(generator);
  },
});

export { expect } from '@playwright/test';
