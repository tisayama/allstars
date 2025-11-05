/**
 * ConnectionStatus component displays real-time connection indicators
 * for Firestore and WebSocket connections
 */

interface ConnectionStatusProps {
  firestoreConnected: boolean;
  websocketConnected: boolean;
  websocketAuthenticated: boolean;
  error?: string | null;
}

export function ConnectionStatus({
  firestoreConnected,
  websocketConnected,
  websocketAuthenticated,
  error,
}: ConnectionStatusProps) {
  // Determine WebSocket status text
  const getWebSocketStatus = () => {
    if (!websocketConnected) return 'Disconnected';
    if (!websocketAuthenticated) return 'Authenticating...';
    return 'Connected';
  };

  const websocketStatus = getWebSocketStatus();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 9999,
        minWidth: '200px',
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <div
          className={firestoreConnected ? 'connected' : 'disconnected'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: firestoreConnected ? '#4ade80' : '#ef4444',
            }}
          />
          <span>Firestore: {firestoreConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div>
        <div
          className={
            websocketConnected && websocketAuthenticated
              ? 'connected'
              : websocketConnected
                ? 'authenticating'
                : 'disconnected'
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                websocketConnected && websocketAuthenticated
                  ? '#4ade80'
                  : websocketConnected
                    ? '#fbbf24'
                    : '#ef4444',
            }}
          />
          <span>WebSocket: {websocketStatus}</span>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fca5a5',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
