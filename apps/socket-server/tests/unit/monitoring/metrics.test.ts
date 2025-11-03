import {
  connectionCountGauge,
  authFailureCounter,
  broadcastLatencyHistogram,
  listenerStatusGauge,
  metricsRegistry,
} from '../../../src/monitoring/metrics';

describe('Prometheus Metrics', () => {
  beforeEach(() => {
    // Reset metrics before each test
    metricsRegistry.resetMetrics();
  });

  describe('connectionCountGauge (OR-001)', () => {
    it('should initialize with zero connections', async () => {
      connectionCountGauge.set(0);
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('socket_connections_total 0');
    });

    it('should increment connection count', async () => {
      connectionCountGauge.inc();
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('socket_connections_total 1');
    });

    it('should decrement connection count', async () => {
      connectionCountGauge.set(5);
      connectionCountGauge.dec();
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('socket_connections_total 4');
    });
  });

  describe('authFailureCounter (OR-002)', () => {
    it('should count authentication failures by reason', async () => {
      authFailureCounter.inc({ reason: 'invalid_token' });
      authFailureCounter.inc({ reason: 'invalid_token' });
      authFailureCounter.inc({ reason: 'expired_token' });
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('auth_failures_total{reason="invalid_token"} 2');
      expect(metrics).toContain('auth_failures_total{reason="expired_token"} 1');
    });
  });

  describe('broadcastLatencyHistogram (OR-003)', () => {
    it('should record broadcast latency', async () => {
      broadcastLatencyHistogram.labels('START_QUESTION').observe(0.045); // 45ms
      broadcastLatencyHistogram.labels('GONG_ACTIVATED').observe(0.032); // 32ms
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('broadcast_latency_seconds_count{event_type="START_QUESTION"} 1');
      expect(metrics).toContain('broadcast_latency_seconds_count{event_type="GONG_ACTIVATED"} 1');
    });

    it('should track percentiles for latency', async () => {
      // Record multiple samples to verify histogram buckets
      for (let i = 0; i < 100; i++) {
        broadcastLatencyHistogram.labels('START_QUESTION').observe(0.01 + i * 0.001); // 10ms to 110ms
      }
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('broadcast_latency_seconds_bucket');
    });
  });

  describe('listenerStatusGauge (OR-004)', () => {
    it('should set listener status to connected (1)', async () => {
      listenerStatusGauge.set(1);
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('firestore_listener_status 1');
    });

    it('should set listener status to disconnected (0)', async () => {
      listenerStatusGauge.set(0);
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('firestore_listener_status 0');
    });

    it('should set listener status to error (2)', async () => {
      listenerStatusGauge.set(2);
      const metrics = await metricsRegistry.metrics();
      expect(metrics).toContain('firestore_listener_status 2');
    });
  });
});
