import type { Page } from '@playwright/test';

/**
 * Network state options for simulating different connectivity scenarios
 */
export enum NetworkState {
  /** All connections active */
  ONLINE = 'online',
  /** All connections offline */
  OFFLINE = 'offline',
  /** WebSocket active, Firestore blocked */
  WEBSOCKET_ONLY = 'websocket-only',
  /** Firestore active, WebSocket disconnected */
  FIRESTORE_ONLY = 'firestore-only'
}

/**
 * Helper class for simulating network conditions in E2E tests
 *
 * Provides precise control over WebSocket and Firestore connectivity
 * to test reconnection logic and fallback behavior.
 */
export class NetworkSimulator {
  constructor(
    private page: Page,
    private socketServerUrl: string = 'http://localhost:3001'
  ) {}

  /**
   * Set network state for testing different connectivity scenarios
   */
  async setState(state: NetworkState): Promise<void> {
    switch (state) {
      case NetworkState.OFFLINE:
        // Disable all network connections
        await this.page.context().setOffline(true);
        break;

      case NetworkState.ONLINE:
        // Enable all network connections
        await this.page.context().setOffline(false);
        // Clear any route blocks
        await this.page.unroute('**/firestore.googleapis.com/**');
        await this.page.unroute('**/localhost:8080/**');
        break;

      case NetworkState.WEBSOCKET_ONLY:
        // Block Firestore HTTP requests
        await this.page.route('**/firestore.googleapis.com/**', route => route.abort());
        await this.page.route('**/localhost:8080/**', route => route.abort());
        break;

      case NetworkState.FIRESTORE_ONLY:
        // Disconnect WebSocket via server endpoint
        const clientId = await this.getWebSocketClientId();
        if (clientId) {
          await fetch(`${this.socketServerUrl}/test/disconnect/${clientId}`, {
            method: 'POST'
          });
        }
        break;
    }
  }

  /**
   * Get current WebSocket client ID from page
   * Returns null if socket not connected
   */
  private async getWebSocketClientId(): Promise<string | null> {
    return await this.page.evaluate(() => {
      // Access socket instance from window (exposed for testing)
      return (window as any).__SOCKET_ID__ || null;
    });
  }

  /**
   * Measure time until WebSocket reconnects
   * Returns time in milliseconds
   */
  async measureReconnectionTime(): Promise<number> {
    const startTime = Date.now();

    try {
      await this.page.waitForFunction(() => {
        return (window as any).__WEBSOCKET_CONNECTED__ === true;
      }, { timeout: 15000 });

      return Date.now() - startTime;
    } catch (error) {
      // Timeout waiting for reconnection
      return 15000; // Return max timeout
    }
  }

  /**
   * Record reconnection attempt timestamps
   * Returns array of timestamps when reconnection attempts occurred
   */
  async recordReconnectionAttempts(): Promise<number[]> {
    const attempts: number[] = [];

    this.page.on('console', msg => {
      if (msg.text().includes('WebSocket reconnection attempt')) {
        attempts.push(Date.now());
      }
    });

    return attempts;
  }

  /**
   * Wait for specific network state to be established
   * Useful for ensuring state transitions are complete
   */
  async waitForState(state: NetworkState, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentState = await this.getCurrentState();
      if (currentState === state) {
        return;
      }
      await this.page.waitForTimeout(100);
    }

    throw new Error(`Timeout waiting for network state: ${state}`);
  }

  /**
   * Get current network state by inspecting page state
   */
  private async getCurrentState(): Promise<NetworkState> {
    const isOffline = await this.page.evaluate(() => !navigator.onLine);
    if (isOffline) {
      return NetworkState.OFFLINE;
    }

    const isWebSocketConnected = await this.page.evaluate(() => {
      return (window as any).__WEBSOCKET_CONNECTED__ === true;
    });

    const isFirestoreActive = await this.page.evaluate(() => {
      return (window as any).__FIRESTORE_ACTIVE__ === true;
    });

    if (isWebSocketConnected && isFirestoreActive) {
      return NetworkState.ONLINE;
    } else if (isWebSocketConnected && !isFirestoreActive) {
      return NetworkState.WEBSOCKET_ONLY;
    } else if (!isWebSocketConnected && isFirestoreActive) {
      return NetworkState.FIRESTORE_ONLY;
    }

    return NetworkState.OFFLINE;
  }
}
