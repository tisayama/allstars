/**
 * ConnectionStatus component displays real-time connection indicators
 * Feature: 001-projector-auth [US1]
 *
 * Enhanced with 5-10% height status bar visible from 3 meters
 */

interface ConnectionStatusProps {
  isConnected?: boolean;
  isAuthenticated?: boolean;
  error?: string | null;
  // Legacy props for backward compatibility
  firestoreConnected?: boolean;
  websocketConnected?: boolean;
  websocketAuthenticated?: boolean;
}

export function ConnectionStatus({
  isConnected,
  isAuthenticated,
  error,
  firestoreConnected,
  websocketConnected,
  websocketAuthenticated,
}: ConnectionStatusProps) {
  // Use new props if provided, otherwise fall back to legacy props
  const connected = isConnected ?? websocketConnected ?? false;
  const authenticated = isAuthenticated ?? websocketAuthenticated ?? false;

  // Determine connection status
  const getConnectionStatus = () => {
    if (error) return 'Error';
    if (!connected) return 'Connecting...';
    if (!authenticated) return 'Authenticating...';
    return 'Connected';
  };

  const getConnectionColor = () => {
    if (error) return 'bg-red-500';
    if (!connected) return 'bg-yellow-500';
    if (!authenticated) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const status = getConnectionStatus();
  const colorClass = getConnectionColor();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '7vh', // 7% of viewport height
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        zIndex: 9999,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Connection indicator dot */}
      <div
        data-testid="connection-indicator"
        className={colorClass}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
        }}
      />

      {/* Status text - large for 3m visibility */}
      <span
        data-testid="connection-status-text"
        style={{
          fontSize: '28px',
          fontWeight: 'bold',
        }}
      >
        {error || status}
      </span>

      {/* Legacy Firestore indicator (if provided) */}
      {firestoreConnected !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '32px',
            fontSize: '20px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: firestoreConnected ? '#4ade80' : '#ef4444',
            }}
          />
          <span>Firestore: {firestoreConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      )}
    </div>
  );
}
