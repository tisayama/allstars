interface LoadingIndicatorProps {
  message?: string;
}

/**
 * Loading indicator with spinner animation
 */
export function LoadingIndicator({ message = 'Loading...' }: LoadingIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          border: '6px solid #333333',
          borderTop: '6px solid #4a9eff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ marginTop: '1.5rem', fontSize: '1.125rem', color: '#cccccc' }}>{message}</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
