/**
 * EmulatorManager - Manage Firebase Emulator lifecycle
 * Feature: 008-e2e-playwright-tests
 *
 * Programmatically start/stop Firebase Emulators and clear data
 */

import { spawn, ChildProcess } from 'child_process';
import * as admin from 'firebase-admin';
import * as http from 'http';

export interface EmulatorConfig {
  /** Firestore emulator port (default: 8080) */
  firestorePort: number;

  /** Auth emulator port (default: 9099) */
  authPort: number;

  /** Firebase project ID for emulators (default: "test") */
  projectId: string;

  /** Whether to show emulator UI (default: false for CI) */
  showUI: boolean;
}

const DEFAULT_CONFIG: EmulatorConfig = {
  firestorePort: 8080,
  authPort: 9099,
  projectId: 'test',
  showUI: false,
};

export class EmulatorManager {
  private process: ChildProcess | null = null;
  private config: EmulatorConfig = DEFAULT_CONFIG;

  /**
   * Start Firebase Emulators with specified configuration
   * @param config - Emulator configuration
   * @param timeoutMs - Maximum time to wait for startup (default: 30000)
   * @throws Error if emulators fail to start within timeout
   */
  async start(
    config: Partial<EmulatorConfig> = {},
    timeoutMs: number = 30000
  ): Promise<void> {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Build command arguments
    const args = [
      'emulators:start',
      '--only',
      'firestore,auth',
      '--project',
      this.config.projectId,
    ];

    // Disable UI in CI or if explicitly requested
    if (!this.config.showUI || process.env.CI) {
      args.push('--no-ui');
    }

    // Spawn emulator process
    this.process = spawn('firebase', args, {
      env: {
        ...process.env,
        FIRESTORE_EMULATOR_HOST: `localhost:${this.config.firestorePort}`,
        FIREBASE_AUTH_EMULATOR_HOST: `localhost:${this.config.authPort}`,
      },
    });

    // Wait for ready signal
    await this.waitForReady(timeoutMs);
  }

  /**
   * Stop Firebase Emulators gracefully
   * @param timeoutMs - Maximum time to wait for shutdown (default: 10000)
   */
  async stop(timeoutMs: number = 10000): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGKILL'); // Force kill if graceful shutdown fails
        reject(new Error(`Emulator shutdown timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.process.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        resolve();
      });

      // Send SIGTERM for graceful shutdown
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Clear all data from Firestore emulator
   */
  async clearData(): Promise<void> {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: this.config.projectId,
      });
    }

    // Point to emulator
    process.env.FIRESTORE_EMULATOR_HOST = `localhost:${this.config.firestorePort}`;

    const db = admin.firestore();

    // Delete all collections
    const collections = await db.listCollections();
    await Promise.all(
      collections.map(async (collection) => {
        const snapshot = await collection.get();
        await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
      })
    );
  }

  /**
   * Check if emulators are ready to accept connections
   * @returns true if both Firestore and Auth emulators are responsive
   */
  async isReady(): Promise<boolean> {
    const checkPort = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
    };

    try {
      // Check both Firestore and Auth health
      const [firestoreReady, authReady] = await Promise.all([
        checkPort(this.config.firestorePort),
        checkPort(this.config.authPort),
      ]);

      return firestoreReady && authReady;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for emulators to be ready
   * @param timeoutMs - Maximum time to wait
   * @throws Error if emulators don't start within timeout
   */
  private async waitForReady(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    let delay = 100;

    while (Date.now() - startTime < timeoutMs) {
      if (await this.isReady()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 2000); // Exponential backoff
    }

    throw new Error(
      `Firebase Emulators failed to start within ${timeoutMs}ms. Check firebase.json configuration.`
    );
  }
}
