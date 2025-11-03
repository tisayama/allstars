import { getServerTime } from '@/lib/api-client';

/**
 * Clock synchronization result
 */
export interface ClockSyncResult {
  clockOffset: number; // milliseconds difference (positive = server ahead)
  minRtt: number; // minimum round-trip time observed
  pingCount: number; // number of successful pings
  timestamp: number; // when sync was performed
}

/**
 * Individual ping result
 */
interface PingResult {
  rtt: number; // round-trip time in ms
  clockOffset: number; // calculated clock offset for this ping
}

/**
 * Perform 5-ping clock synchronization with server.
 * Uses minimum RTT algorithm for best accuracy.
 *
 * Algorithm:
 * 1. Send 5 ping requests to server
 * 2. For each ping, calculate:
 *    - RTT = clientReceiveTime - clientSendTime
 *    - estimatedServerTime = clientReceiveTime - RTT/2
 *    - clockOffset = serverTime - estimatedServerTime
 * 3. Select offset from ping with minimum RTT (most accurate)
 *
 * @returns Clock synchronization result with offset and metadata
 * @throws Error if all pings fail
 */
export async function performClockSync(): Promise<ClockSyncResult> {
  const pingResults: PingResult[] = [];
  const maxRetries = 10; // Allow up to 10 attempts to get 5 successful pings
  let attempts = 0;

  while (pingResults.length < 5 && attempts < maxRetries) {
    attempts++;

    try {
      const clientSendTime = Date.now();
      const response = await getServerTime(clientSendTime);
      const clientReceiveTime = Date.now();

      // Calculate RTT and clock offset
      const rtt = clientReceiveTime - clientSendTime;
      const estimatedServerTime = clientReceiveTime - rtt / 2;
      const clockOffset = response.serverTime - estimatedServerTime;

      pingResults.push({ rtt, clockOffset });
    } catch (error) {
      console.warn(`Clock sync ping ${attempts} failed:`, error);
      // Continue to next attempt
    }
  }

  if (pingResults.length === 0) {
    throw new Error('Clock synchronization failed: all pings failed');
  }

  if (pingResults.length < 5) {
    console.warn(`Clock sync completed with only ${pingResults.length}/5 successful pings`);
  }

  // Select offset from ping with minimum RTT
  const clockOffset = calculateOffset(pingResults);
  const minRtt = Math.min(...pingResults.map((p) => p.rtt));

  // Warn if offset is large (may indicate network issues)
  if (Math.abs(clockOffset) > 500) {
    console.warn(
      `Clock offset exceeds 500ms: ${clockOffset}ms (minRTT: ${minRtt}ms). ` +
        'This may affect timing accuracy.'
    );
  }

  return {
    clockOffset,
    minRtt,
    pingCount: pingResults.length,
    timestamp: Date.now(),
  };
}

/**
 * Calculate final clock offset using minimum RTT algorithm.
 * Selects offset from ping with lowest RTT (most direct network path).
 *
 * @param pingResults - Array of ping results with RTT and offsets
 * @returns Clock offset from minimum RTT ping
 */
export function calculateOffset(pingResults: PingResult[]): number {
  if (pingResults.length === 0) {
    throw new Error('Cannot calculate offset: no ping results');
  }

  // Find ping with minimum RTT
  let minRttPing = pingResults[0]!;
  for (const ping of pingResults) {
    if (ping.rtt < minRttPing.rtt) {
      minRttPing = ping;
    }
  }

  return minRttPing.clockOffset;
}

/**
 * Apply clock offset to client timestamp to get server-equivalent time.
 *
 * @param clientTime - Client timestamp (Unix ms)
 * @param clockOffset - Clock offset from synchronization (ms)
 * @returns Server-equivalent timestamp (Unix ms)
 */
export function applyClockOffset(clientTime: number, clockOffset: number): number {
  return clientTime + clockOffset;
}

/**
 * Calculate response time for answer submission.
 * Uses clock offset to ensure fair timing across all guests.
 *
 * @param questionStartTime - Server timestamp when question started (Unix ms)
 * @param answerTapTime - Client timestamp when answer was tapped (Unix ms)
 * @param clockOffset - Clock offset from synchronization (ms)
 * @returns Response time in milliseconds
 */
export function calculateResponseTime(
  questionStartTime: number,
  answerTapTime: number,
  clockOffset: number
): number {
  const serverEquivalentTapTime = applyClockOffset(answerTapTime, clockOffset);
  return serverEquivalentTapTime - questionStartTime;
}
