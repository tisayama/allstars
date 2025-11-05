/**
 * Vibration API wrapper with progressive enhancement and fallback.
 *
 * Vibration patterns per spec:
 * - Tap: 50ms (immediate feedback on answer selection)
 * - Success: 2x100ms with 50ms pause (correct answer)
 * - Failure: 300ms (incorrect answer)
 *
 * Note: Vibration API may not work in:
 * - Browsers without support (fallback to no vibration)
 * - Battery saver mode (vibrate() returns false)
 * - Background tabs (may be throttled)
 */

/**
 * Check if vibration is supported and enabled
 */
export function isVibrationSupported(): boolean {
  if (import.meta.env.VITE_DISABLE_VIBRATION === 'true') {
    return false;
  }
  return 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

/**
 * Safe vibration wrapper that handles unsupported browsers
 */
function safeVibrate(pattern: number | number[]): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration throws error
    // This can happen in some browser environments
    console.warn('Vibration failed:', error);
  }
}

/**
 * Vibrate on answer tap (50ms)
 * Provides immediate tactile feedback when user selects an answer
 */
export function vibrateTap(): void {
  safeVibrate(50);
}

/**
 * Vibrate on correct answer (2x100ms with 50ms pause)
 * Pattern: vibrate 100ms, pause 50ms, vibrate 100ms
 */
export function vibrateSuccess(): void {
  safeVibrate([100, 50, 100]);
}

/**
 * Vibrate on incorrect answer (300ms)
 * Single long vibration to indicate failure
 */
export function vibrateFailure(): void {
  safeVibrate(300);
}

/**
 * Stop any ongoing vibration
 */
export function stopVibration(): void {
  if (isVibrationSupported()) {
    try {
      navigator.vibrate(0);
    } catch (error) {
      console.warn('Stop vibration failed:', error);
    }
  }
}
