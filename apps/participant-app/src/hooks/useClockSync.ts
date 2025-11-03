import { useState, useEffect, useCallback } from 'react';
import { performClockSync, ClockSyncResult } from '@/utils/clock-sync';

const RESYNC_INTERVAL_MS = 45 * 1000; // 45 seconds (between 30-60s per spec)

/**
 * Clock synchronization hook
 *
 * Performs initial sync on mount, then re-syncs periodically.
 * Warns if clock offset exceeds 500ms.
 */
export function useClockSync() {
  const [syncResult, setSyncResult] = useState<ClockSyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Perform clock synchronization
   */
  const sync = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      const result = await performClockSync();
      setSyncResult(result);

      // Warn if offset is large
      if (Math.abs(result.clockOffset) > 500) {
        console.warn(
          `Large clock offset detected: ${result.clockOffset}ms. This may affect timing accuracy.`
        );
      }
    } catch (err) {
      const error = err as Error;
      console.error('Clock sync failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, []);

  /**
   * Initial sync on mount + periodic re-sync
   */
  useEffect(() => {
    // Initial sync
    sync();

    // Periodic re-sync
    const interval = setInterval(() => {
      sync();
    }, RESYNC_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sync]);

  return {
    clockOffset: syncResult?.clockOffset ?? null,
    minRtt: syncResult?.minRtt ?? null,
    lastSyncTime: syncResult?.timestamp ?? null,
    syncing,
    error,
    sync, // Manual sync function
    isSynced: syncResult !== null && error === null,
  };
}
