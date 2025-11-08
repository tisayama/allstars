interface ConnectionIndicatorProps {
  isVisible: boolean;
}

/**
 * Connection status indicator
 *
 * Shows a warning message when the socket connection is lost
 * Appears after 2 seconds of disconnection
 */
export function ConnectionIndicator({ isVisible }: ConnectionIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="connection-indicator">
      <span className="indicator-icon">⚠️</span>
      <span className="indicator-text">接続が切断されました</span>
    </div>
  );
}
