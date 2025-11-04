/**
 * Global setup for E2E tests
 * Feature: 008-e2e-playwright-tests
 *
 * Orchestrates emulator and application lifecycle
 * Runs BEFORE all tests execute
 */

import { FullConfig } from '@playwright/test';
import { EmulatorManager } from './helpers/emulatorManager';
import { AppLauncher, AppLaunchConfig } from './helpers/appLauncher';
import { ChildProcess } from 'child_process';
import * as path from 'path';

// Global state for cleanup in teardown
let emulatorManager: EmulatorManager;
let appLauncher: AppLauncher;
let emulatorProcess: any;
let appProcesses: ChildProcess[] = [];

async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting E2E test infrastructure...\n');

  const rootDir = path.resolve(__dirname, '../..');

  try {
    // Step 1: Start Firebase Emulators
    console.log('📦 Starting Firebase Emulators...');
    emulatorManager = new EmulatorManager();
    await emulatorManager.start(
      {
        firestorePort: 8080,
        authPort: 9099,
        projectId: 'test',
        showUI: !process.env.CI,
      },
      30000
    );
    console.log('✅ Firebase Emulators ready\n');

    // Step 2: Clear emulator data for clean slate
    console.log('🧹 Clearing emulator data...');
    await emulatorManager.clearData();
    console.log('✅ Emulator data cleared\n');

    // Step 3: Launch applications
    console.log('🎯 Launching applications...');
    appLauncher = new AppLauncher();

    const appConfigs: AppLaunchConfig[] = [
      {
        name: 'api-server',
        cwd: path.join(rootDir, 'apps/api-server'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:3000/health',
        port: 3000,
        env: {
          FIRESTORE_EMULATOR_HOST: 'localhost:8080',
          FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
        },
      },
      {
        name: 'socket-server',
        cwd: path.join(rootDir, 'apps/socket-server'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:3001/health',
        port: 3001,
        env: {
          FIRESTORE_EMULATOR_HOST: 'localhost:8080',
        },
      },
      {
        name: 'participant-app',
        cwd: path.join(rootDir, 'apps/participant-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:5173',
        port: 5173,
      },
      {
        name: 'host-app',
        cwd: path.join(rootDir, 'apps/host-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:5174',
        port: 5174,
      },
      {
        name: 'projector-app',
        cwd: path.join(rootDir, 'apps/projector-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:5175',
        port: 5175,
      },
      {
        name: 'admin-app',
        cwd: path.join(rootDir, 'apps/admin-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://localhost:5176',
        port: 5176,
      },
    ];

    appProcesses = await appLauncher.launchMany(appConfigs, 60000);
    console.log('✅ All applications ready\n');

    console.log('🎉 E2E test infrastructure ready!\n');
  } catch (error) {
    console.error('❌ Failed to start E2E infrastructure:', error);

    // Cleanup on failure
    if (appProcesses.length > 0) {
      await appLauncher.stopMany(appProcesses).catch(console.error);
    }
    if (emulatorManager) {
      await emulatorManager.stop().catch(console.error);
    }

    throw error;
  }
}

export default globalSetup;

// Export for teardown
export { emulatorManager, appLauncher, appProcesses };
