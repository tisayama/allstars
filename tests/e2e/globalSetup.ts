/**
 * Global setup for E2E tests
 * Feature: 008-e2e-playwright-tests
 *
 * Orchestrates emulator and application lifecycle
 * Runs BEFORE all tests execute
 */

import { FullConfig } from '@playwright/test';
import { EmulatorManager } from './setup/emulator-manager';
import { AppLauncher, AppLaunchConfig } from './setup/app-launcher';
import { FirestoreInit } from './setup/firestore-init';
import { HostnameConfigManager } from './setup/hostname-config';
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
    // Step 0: Verify hostname configuration
    console.log('🔍 Verifying work-ubuntu hostname...');
    const hostnameManager = new HostnameConfigManager();
    const hostnameValid = await hostnameManager.verifyHostname();
    if (!hostnameValid) {
      console.error('❌ Hostname not configured correctly!');
      console.error('Run this command to fix:');
      console.error(hostnameManager.getSuggestedFix());
      throw new Error('work-ubuntu hostname not configured');
    }
    console.log('✅ Hostname configured correctly\n');

    // Step 1: Start Firebase Emulators
    console.log('📦 Starting Firebase Emulators...');
    emulatorManager = new EmulatorManager();
    await emulatorManager.start(
      {
        firestorePort: 8080,
        authPort: 9099,
        projectId: 'stg-wedding-allstars',
        showUI: !process.env.CI,
      },
      30000
    );
    console.log('✅ Firebase Emulators ready\n');

    // Step 2: Clear emulator data for clean slate
    console.log('🧹 Clearing emulator data...');
    const firestoreInit = new FirestoreInit({
      emulatorHost: 'localhost:8080',
      projectId: 'stg-wedding-allstars',
    });
    await firestoreInit.clearAllData();
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
        healthUrl: 'http://work-ubuntu:3000/health',
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
        healthUrl: 'http://work-ubuntu:3001/health',
        port: 3001,
        env: {
          FIRESTORE_EMULATOR_HOST: 'localhost:8080',
        },
      },
      {
        name: 'admin-app',
        cwd: path.join(rootDir, 'apps/admin-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5170',
        port: 5170,
      },
      {
        name: 'host-app',
        cwd: path.join(rootDir, 'apps/host-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5175',
        port: 5175,
      },
      {
        name: 'participant-app',
        cwd: path.join(rootDir, 'apps/participant-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5180',
        port: 5180,
      },
      {
        name: 'projector-app',
        cwd: path.join(rootDir, 'apps/projector-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5185',
        port: 5185,
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
