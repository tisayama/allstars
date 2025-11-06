/**
 * Health State Management
 * Tracks whether the Firestore listener is healthy
 * FR-011a: Reject new connections when listener is disconnected
 */
import { logger } from './logger';
import { listenerStatusGauge } from '../monitoring/metrics';

/**
 * Global health state flag
 * - true: Firestore listener is connected and healthy
 * - false: Firestore listener is disconnected or in error state
 */
let healthy = true;

/**
 * Check if the server is in a healthy state
 * @returns true if Firestore listener is connected, false otherwise
 */
export function isHealthy(): boolean {
  // Development mode: Always return healthy if DISABLE_AUTH is set
  if (process.env.DISABLE_AUTH === 'true') {
    return true;
  }
  return healthy;
}

/**
 * Set the server health status
 * @param status - true for healthy, false for degraded
 */
export function setHealthy(status: boolean): void {
  if (healthy !== status) {
    healthy = status;
    logger.info(`Server health status changed: ${status ? 'HEALTHY' : 'DEGRADED'}`);

    // Update metrics gauge
    // 0=disconnected, 1=connected, 2=error
    if (status) {
      listenerStatusGauge.set(1); // Connected
    } else {
      listenerStatusGauge.set(0); // Disconnected
    }
  }
}
