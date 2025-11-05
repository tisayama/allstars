/**
 * AppLauncher - Launch and manage application processes
 * Feature: 008-e2e-playwright-tests
 *
 * Spawn app processes and wait for health checks
 */

import { spawn, ChildProcess } from 'child_process';
import { HealthChecker } from './healthChecker';

export type AppName =
  | 'admin-app'
  | 'host-app'
  | 'projector-app'
  | 'participant-app'
  | 'api-server'
  | 'socket-server';

export interface AppLaunchConfig {
  /** App name */
  name: AppName;

  /** Working directory for app (e.g., "/home/user/allstars/apps/api-server") */
  cwd: string;

  /** Launch command (e.g., "pnpm") */
  command: string;

  /** Launch command arguments */
  args?: string[];

  /** Environment variables to set */
  env?: Record<string, string>;

  /** Health check URL (e.g., "http://localhost:3000/health") */
  healthUrl: string;

  /** Port number the app listens on */
  port: number;
}

export class AppLauncher {
  private healthChecker = new HealthChecker();

  /**
   * Launch an application and wait for it to be ready
   * @param config - App launch configuration
   * @param timeoutMs - Maximum time to wait for app readiness (default: 30000)
   * @returns Process handle for cleanup
   * @throws Error if app fails to become ready within timeout
   */
  async launch(
    config: AppLaunchConfig,
    timeoutMs: number = 30000
  ): Promise<ChildProcess> {
    const { name, cwd, command, args = [], env = {}, healthUrl } = config;

    // Spawn app process
    const process = spawn(command, args, {
      cwd,
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'pipe', // Capture stdout/stderr for debugging
    });

    // Log output for debugging
    process.stdout?.on('data', (data) => {
      console.log(`[${name}] ${data.toString()}`);
    });

    process.stderr?.on('data', (data) => {
      console.error(`[${name}] ERROR: ${data.toString()}`);
    });

    // Handle process errors
    process.on('error', (error) => {
      throw new Error(`Failed to start ${name}: ${error.message}`);
    });

    // Wait for health check to pass
    try {
      await this.healthChecker.waitForReady({ url: healthUrl, timeoutMs });
    } catch (error) {
      // Kill process if health check fails
      process.kill('SIGTERM');
      throw new Error(
        `App ${name} failed health check within ${timeoutMs}ms. Check app logs for errors.`
      );
    }

    return process;
  }

  /**
   * Launch multiple apps in parallel
   * @param configs - Array of app launch configurations
   * @param timeoutMs - Maximum time to wait for all apps (default: 60000)
   * @returns Array of process handles in same order as configs
   */
  async launchMany(
    configs: AppLaunchConfig[],
    timeoutMs: number = 60000
  ): Promise<ChildProcess[]> {
    // Launch all apps in parallel
    const launchPromises = configs.map((config) =>
      this.launch(config, timeoutMs)
    );

    return Promise.all(launchPromises);
  }

  /**
   * Stop an application gracefully
   * @param process - Process handle from launch()
   * @param timeoutMs - Maximum time to wait for shutdown (default: 5000)
   */
  async stop(
    process: ChildProcess,
    timeoutMs: number = 5000
  ): Promise<void> {
    if (!process || process.killed) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill('SIGKILL'); // Force kill if graceful shutdown fails
        reject(new Error(`Process shutdown timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      process.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      process.kill('SIGTERM');
    });
  }

  /**
   * Stop multiple applications in parallel
   * @param processes - Array of process handles
   * @param timeoutMs - Maximum time to wait for all shutdowns (default: 10000)
   */
  async stopMany(
    processes: ChildProcess[],
    timeoutMs: number = 10000
  ): Promise<void> {
    const stopPromises = processes.map((process) =>
      this.stop(process, timeoutMs)
    );

    await Promise.allSettled(stopPromises); // Don't fail if one shutdown fails
  }
}
