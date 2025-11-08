import { useState, useEffect, useRef } from 'react';

interface FPSMonitorResult {
  fps: number;
  isDegraded: boolean;
}

const FPS_DEGRADATION_THRESHOLD = 25;
const FPS_RECOVERY_THRESHOLD = 35;
const THRESHOLD_DURATION_MS = 2000; // 2 seconds

/**
 * Custom hook to monitor FPS and detect performance degradation
 *
 * Degradation is triggered when FPS < 25 for 2 consecutive seconds
 * Recovery is triggered when FPS > 35 for 2 consecutive seconds after degradation
 *
 * @returns {FPSMonitorResult} Current FPS and degradation state
 */
export function useFPSMonitor(): FPSMonitorResult {
  const [fps, setFps] = useState(60);
  const [isDegraded, setIsDegraded] = useState(false);

  const frameTimesRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const degradationStartRef = useRef<number | null>(null);
  const recoveryStartRef = useRef<number | null>(null);

  useEffect(() => {
    const measureFPS = (currentTime: number) => {
      const lastTime = lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Calculate time delta
      const delta = currentTime - lastTime;

      // Store frame time
      frameTimesRef.current.push(delta);

      // Keep only last 60 frames for FPS calculation
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate average FPS
      if (frameTimesRef.current.length >= 10) {
        const avgDelta =
          frameTimesRef.current.reduce((sum, d) => sum + d, 0) /
          frameTimesRef.current.length;
        const currentFps = 1000 / avgDelta;
        setFps(Math.round(currentFps));

        // Check for degradation
        if (currentFps < FPS_DEGRADATION_THRESHOLD) {
          if (degradationStartRef.current === null) {
            degradationStartRef.current = currentTime;
          } else if (
            currentTime - degradationStartRef.current >=
            THRESHOLD_DURATION_MS
          ) {
            setIsDegraded(true);
          }
          // Reset recovery tracking
          recoveryStartRef.current = null;
        } else if (currentFps > FPS_RECOVERY_THRESHOLD && isDegraded) {
          if (recoveryStartRef.current === null) {
            recoveryStartRef.current = currentTime;
          } else if (
            currentTime - recoveryStartRef.current >=
            THRESHOLD_DURATION_MS
          ) {
            setIsDegraded(false);
          }
          // Reset degradation tracking
          degradationStartRef.current = null;
        } else {
          // FPS is in between thresholds, reset tracking
          if (currentFps >= FPS_DEGRADATION_THRESHOLD) {
            degradationStartRef.current = null;
          }
          if (currentFps <= FPS_RECOVERY_THRESHOLD) {
            recoveryStartRef.current = null;
          }
        }
      }

      // Continue monitoring
      rafIdRef.current = requestAnimationFrame(measureFPS);
    };

    // Start monitoring
    rafIdRef.current = requestAnimationFrame(measureFPS);

    // Cleanup on unmount
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isDegraded]);

  return { fps, isDegraded };
}
