/**
 * Global teardown for E2E tests
 * Feature: 008-e2e-playwright-tests
 *
 * Cleanup emulator and application processes
 * Runs AFTER all tests complete
 */

import { FullConfig } from '@playwright/test';
import { emulatorManager, appLauncher, appProcesses } from './globalSetup';

async function globalTeardown(config: FullConfig) {
  console.log('\n🛑 Shutting down E2E test infrastructure...\n');

  try {
    // Step 1: Stop applications
    if (appProcesses && appProcesses.length > 0) {
      console.log('📱 Stopping applications...');
      await appLauncher.stopMany(appProcesses, 10000);
      console.log('✅ Applications stopped\n');
    }

    // Step 2: Stop emulators
    if (emulatorManager) {
      console.log('📦 Stopping Firebase Emulators...');
      await emulatorManager.stop(10000);
      console.log('✅ Emulators stopped\n');
    }

    console.log('👋 E2E test infrastructure shutdown complete\n');
  } catch (error) {
    console.error('⚠️  Warning: Some processes may not have stopped cleanly:', error);
    // Don't throw - allow test runner to exit
  }
}

export default globalTeardown;
