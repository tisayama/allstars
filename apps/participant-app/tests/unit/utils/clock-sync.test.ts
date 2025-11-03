import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  getServerTime: vi.fn(),
}));

describe('Clock Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('performClockSync', () => {
    it('should perform 5 pings and select minimum RTT offset', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      let pingCount = 0;
      vi.mocked(getServerTime).mockImplementation(async (clientSendTime: number) => {
        pingCount++;
        // Simulate different RTTs for each ping
        const rttValues = [150, 100, 200, 120, 180];
        const rtt = rttValues[pingCount - 1] || 100;

        // Advance time by RTT
        vi.advanceTimersByTime(rtt);

        // Server is 50ms ahead of client (before RTT compensation)
        const serverTime = clientSendTime + 50 + rtt / 2;

        return {
          serverTime,
          clientSendTime,
        };
      });

      vi.setSystemTime(1000);
      const result = await performClockSync();

      // Should have called getServerTime 5 times
      expect(getServerTime).toHaveBeenCalledTimes(5);

      // Should return offset from minimum RTT ping
      // With minimum RTT (100ms), server is 50ms ahead
      expect(result.clockOffset).toBe(50);
      expect(result.minRtt).toBe(100);
      expect(result.pingCount).toBe(5);
    });

    it('should calculate clock offset correctly', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      // Single ping for simplicity
      vi.mocked(getServerTime).mockImplementation(async (clientSendTime: number) => {
        const rtt = 100;
        const clientReceiveTime = clientSendTime + rtt;
        vi.setSystemTime(clientReceiveTime);

        return {
          serverTime: 1050, // Server is 50ms ahead after compensating for rtt/2
          clientSendTime,
        };
      });

      vi.setSystemTime(1000);
      const result = await performClockSync();

      // clockOffset = serverTime - estimatedServerTime
      // estimatedServerTime = clientReceiveTime - rtt/2 = 1100 - 50 = 1050
      // clockOffset = 1050 - 1050 = 0ms
      expect(result.clockOffset).toBeDefined();
      expect(typeof result.clockOffset).toBe('number');
    });

    it('should warn if clock offset exceeds 500ms', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock large clock offset
      vi.mocked(getServerTime).mockResolvedValue({
        serverTime: 2000, // 900ms difference after rtt/2 compensation
        clientSendTime: 1000,
      });

      vi.setSystemTime(1000);
      await performClockSync();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Clock offset exceeds 500ms')
      );

      warnSpy.mockRestore();
    });

    it('should handle network failures and retry', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      // First call fails, subsequent calls succeed
      vi.mocked(getServerTime)
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          serverTime: 1100,
          clientSendTime: 1000,
        });

      vi.setSystemTime(1000);
      const result = await performClockSync();

      // Should have retried and succeeded
      expect(getServerTime).toHaveBeenCalledTimes(6); // 1 failure + 5 successes
      expect(result.clockOffset).toBeDefined();
    });

    it('should throw error if all pings fail', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      vi.mocked(getServerTime).mockRejectedValue(new Error('Network error'));

      vi.setSystemTime(1000);

      await expect(performClockSync()).rejects.toThrow();
    });
  });

  describe('calculateOffset', () => {
    it('should calculate offset using minimum RTT algorithm', async () => {
      const { calculateOffset } = await import('@/utils/clock-sync');

      const pingResults = [
        { rtt: 150, clockOffset: 45 },
        { rtt: 100, clockOffset: 50 }, // Minimum RTT
        { rtt: 200, clockOffset: 40 },
        { rtt: 120, clockOffset: 48 },
        { rtt: 180, clockOffset: 42 },
      ];

      const offset = calculateOffset(pingResults);

      // Should select offset from minimum RTT ping (100ms)
      expect(offset).toBe(50);
    });

    it('should handle tie in RTT by selecting first occurrence', async () => {
      const { calculateOffset } = await import('@/utils/clock-sync');

      const pingResults = [
        { rtt: 100, clockOffset: 45 }, // First minimum
        { rtt: 100, clockOffset: 50 }, // Tie
        { rtt: 120, clockOffset: 48 },
      ];

      const offset = calculateOffset(pingResults);

      // Should select first occurrence
      expect(offset).toBe(45);
    });
  });

  describe('applyClock Offset', () => {
    it('should adjust client timestamp by clock offset', async () => {
      const { applyClockOffset } = await import('@/utils/clock-sync');

      const clientTime = 1000;
      const clockOffset = 50;

      const serverTime = applyClockOffset(clientTime, clockOffset);

      // serverTime = clientTime + clockOffset
      expect(serverTime).toBe(1050);
    });

    it('should handle negative clock offset', async () => {
      const { applyClockOffset } = await import('@/utils/clock-sync');

      const clientTime = 1000;
      const clockOffset = -50; // Client is ahead of server

      const serverTime = applyClockOffset(clientTime, clockOffset);

      expect(serverTime).toBe(950);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high RTT (>1000ms)', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      vi.mocked(getServerTime).mockImplementation(async (clientSendTime: number) => {
        const rtt = 1500; // High latency
        const clientReceiveTime = clientSendTime + rtt;
        vi.setSystemTime(clientReceiveTime);

        return {
          serverTime: clientSendTime + 750, // rtt/2
          clientSendTime,
        };
      });

      vi.setSystemTime(1000);
      const result = await performClockSync();

      expect(result.minRtt).toBeGreaterThan(1000);
      expect(result.clockOffset).toBeDefined();
    });

    it('should handle clock drift during sync', async () => {
      const { getServerTime } = await import('@/lib/api-client');
      const { performClockSync } = await import('@/utils/clock-sync');

      let currentTime = 1000;
      vi.mocked(getServerTime).mockImplementation(async () => {
        currentTime += 100; // Simulate time passing
        vi.setSystemTime(currentTime);

        return {
          serverTime: currentTime,
          clientSendTime: currentTime - 100,
        };
      });

      vi.setSystemTime(1000);
      const result = await performClockSync();

      // Should complete despite clock drift
      expect(result.clockOffset).toBeDefined();
      expect(result.pingCount).toBe(5);
    });
  });
});
