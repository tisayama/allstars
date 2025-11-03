/**
 * Event Broadcaster - Broadcasts Socket.io events to clients
 * OR-003: Track broadcast latency (p95/p99)
 */
import type { Server as SocketIOServer } from 'socket.io';
import { broadcastLatencyHistogram } from '../monitoring/metrics';
import { logger } from '../utils/logger';
import type { SocketEvent } from './eventMapper';

/**
 * Broadcast event to all clients in gameRoom
 * @param io - Socket.io server instance
 * @param event - Event to broadcast (name and payload)
 */
export function broadcastEvent(io: SocketIOServer, event: SocketEvent): void {
  const startTime = Date.now();

  try {
    // Broadcast to all authenticated clients in gameRoom
    io.to('gameRoom').emit(event.eventName as any, event.payload);

    // Track broadcast latency (OR-003)
    const latencyMs = Date.now() - startTime;
    broadcastLatencyHistogram.labels(event.eventName).observe(latencyMs / 1000); // Convert to seconds

    logger.info(
      `Broadcast ${event.eventName} to gameRoom (latency: ${latencyMs}ms, payload: ${JSON.stringify(event.payload).substring(0, 100)})`
    );
  } catch (error) {
    logger.error(`Failed to broadcast ${event.eventName}`, error as Error);
    throw error;
  }
}
