/**
 * Manual teardown script for E2E tests
 * Feature: 001-system-e2e-tests
 *
 * Stops emulators and apps manually (for e2e:teardown command)
 * Useful for cleaning up after manual setup
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function manualTeardown() {
  console.log('\n🛑 Stopping E2E test infrastructure...\n');

  try {
    // Kill all node processes (apps)
    console.log('📱 Stopping application processes...');
    try {
      await execAsync('pkill -f "pnpm.*dev" || true');
      console.log('✅ Application processes stopped\n');
    } catch (error) {
      // pkill returns error if no processes found, which is fine
      console.log('✅ No application processes found\n');
    }

    // Kill Firebase emulators
    console.log('📦 Stopping Firebase Emulators...');
    try {
      await execAsync('pkill -f "firebase.*emulators" || true');
      console.log('✅ Emulators stopped\n');
    } catch (error) {
      // pkill returns error if no processes found, which is fine
      console.log('✅ No emulator processes found\n');
    }

    console.log('👋 E2E test infrastructure teardown complete\n');
  } catch (error) {
    console.error('⚠️  Warning: Some processes may not have stopped cleanly:', error);
    process.exit(1);
  }
}

manualTeardown();
