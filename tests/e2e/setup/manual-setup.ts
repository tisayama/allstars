/**
 * Manual setup script for E2E tests
 * Feature: 001-system-e2e-tests
 *
 * Runs emulators and apps manually (for e2e:setup command)
 * Useful for debugging and development
 */

import { EmulatorManager } from './emulator-manager';
import { AppLauncher, AppLaunchConfig } from './app-launcher';
import { FirestoreInit } from './firestore-init';
import { HostnameConfigManager } from './hostname-config';
import * as path from 'path';

async function manualSetup() {
  console.log('\n🚀 Starting E2E test infrastructure (manual mode)...\n');

  const rootDir = path.resolve(__dirname, '../../..');

  try {
    // Step 0: Verify hostname configuration
    console.log('🔍 Verifying work-ubuntu hostname...');
    const hostnameManager = new HostnameConfigManager();
    const hostnameValid = await hostnameManager.verifyHostname();
    if (!hostnameValid) {
      console.error('❌ Hostname not configured correctly!');
      console.error('Run this command to fix:');
      console.error(hostnameManager.getSuggestedFix());
      process.exit(1);
    }
    console.log('✅ Hostname configured correctly\n');

    // Step 1: Start Firebase Emulators
    console.log('📦 Starting Firebase Emulators...');
    const emulatorManager = new EmulatorManager();
    await emulatorManager.start(
      {
        firestorePort: 8080,
        authPort: 9099,
        projectId: 'stg-wedding-allstars',
        showUI: true,
      },
      30000
    );
    console.log('✅ Firebase Emulators ready\n');

    // Step 2: Clear emulator data
    console.log('🧹 Clearing emulator data...');
    const firestoreInit = new FirestoreInit({
      emulatorHost: 'localhost:8080',
      projectId: 'stg-wedding-allstars',
    });
    await firestoreInit.clearAllData();
    console.log('✅ Emulator data cleared\n');

    // Step 3: Launch applications
    console.log('🎯 Launching applications...');
    const appLauncher = new AppLauncher();

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
        name: 'participant-app',
        cwd: path.join(rootDir, 'apps/participant-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5173',
        port: 5173,
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
        name: 'projector-app',
        cwd: path.join(rootDir, 'apps/projector-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5176',
        port: 5176,
      },
      {
        name: 'admin-app',
        cwd: path.join(rootDir, 'apps/admin-app'),
        command: 'pnpm',
        args: ['dev'],
        healthUrl: 'http://work-ubuntu:5174',
        port: 5174,
      },
    ];

    await appLauncher.launchMany(appConfigs, 60000);
    console.log('✅ All applications ready\n');

    console.log('🎉 E2E test infrastructure ready!\n');
    console.log('Press Ctrl+C to stop all services');

    // Keep process alive
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start E2E infrastructure:', error);
    process.exit(1);
  }
}

manualSetup();
