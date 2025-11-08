/**
 * Unit tests for EmulatorManager
 * Feature: 001-system-e2e-tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmulatorManager } from './emulator-manager';

describe('EmulatorManager', () => {
  let manager: EmulatorManager;

  beforeEach(() => {
    manager = new EmulatorManager();
  });

  afterEach(async () => {
    // Cleanup: stop emulator if running
    try {
      await manager.stop(1000);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(manager).toBeDefined();
      expect(manager).toBeInstanceOf(EmulatorManager);
    });
  });

  describe('isReady', () => {
    it('should return false when emulators are not running', async () => {
      const ready = await manager.isReady();
      expect(ready).toBe(false);
    });
  });

  describe('clearData', () => {
    it('should not throw when clearing data on stopped emulator', async () => {
      // This test verifies that clearData can handle emulator not running
      await expect(manager.clearData()).resolves.not.toThrow();
    });
  });
});
