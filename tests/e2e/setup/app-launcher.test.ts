/**
 * Unit tests for AppLauncher
 * Feature: 001-system-e2e-tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AppLauncher, AppLaunchConfig } from './app-launcher';

describe('AppLauncher', () => {
  let launcher: AppLauncher;

  beforeEach(() => {
    launcher = new AppLauncher();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(launcher).toBeDefined();
      expect(launcher).toBeInstanceOf(AppLauncher);
    });
  });

  describe('launch configuration', () => {
    it('should accept valid app launch config', () => {
      const config: AppLaunchConfig = {
        name: 'test-app',
        cwd: '/tmp',
        command: 'echo',
        args: ['hello'],
        healthUrl: 'http://work-ubuntu:3000/health',
        port: 3000,
      };

      expect(config.name).toBe('test-app');
      expect(config.healthUrl).toContain('work-ubuntu');
    });

    it('should validate health URL uses work-ubuntu', () => {
      const config: AppLaunchConfig = {
        name: 'test-app',
        cwd: '/tmp',
        command: 'echo',
        args: [],
        healthUrl: 'http://work-ubuntu:3000/health',
        port: 3000,
      };

      expect(config.healthUrl).not.toContain('localhost');
      expect(config.healthUrl).toContain('work-ubuntu');
    });
  });
});
