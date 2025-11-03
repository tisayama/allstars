/**
 * Prometheus metrics for socket-server observability (OR-001 through OR-004)
 */
import { register, Gauge, Counter, Histogram } from 'prom-client';

/**
 * OR-001: Active WebSocket connection count
 */
export const connectionCountGauge = new Gauge({
  name: 'socket_connections_total',
  help: 'Number of currently active WebSocket connections',
  registers: [register],
});

/**
 * OR-002: Authentication failure count
 */
export const authFailureCounter = new Counter({
  name: 'auth_failures_total',
  help: 'Total number of failed authentication attempts',
  labelNames: ['reason'],
  registers: [register],
});

/**
 * OR-003: Event broadcast latency (Firestore snapshot → Socket.io emit)
 * Buckets in seconds: 1ms, 5ms, 10ms, 50ms, 100ms, 500ms, 1s
 */
export const broadcastLatencyHistogram = new Histogram({
  name: 'broadcast_latency_seconds',
  help: 'Latency from Firestore snapshot to Socket.io broadcast completion',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
  labelNames: ['event_type'],
  registers: [register],
});

/**
 * OR-004: Firestore listener connection status
 * Values: 0 = disconnected, 1 = connected, 2 = error
 */
export const listenerStatusGauge = new Gauge({
  name: 'firestore_listener_status',
  help: 'Firestore listener connection status (0=disconnected, 1=connected, 2=error)',
  registers: [register],
});

/**
 * Export the Prometheus registry for /metrics endpoint
 */
export { register as metricsRegistry };
