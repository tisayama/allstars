interface ErrorScreenProps {
  title?: string;
  message: string;
  details?: string;
}

/**
 * Error screen displayed when critical errors occur
 */
export function ErrorScreen({ title = 'Error', message, details }: ErrorScreenProps) {
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
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ff4444' }}>{title}</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#cccccc' }}>{message}</p>
        {details && (
          <pre
            style={{
              fontSize: '0.875rem',
              padding: '1rem',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              overflow: 'auto',
              textAlign: 'left',
              color: '#ff6666',
            }}
          >
            {details}
          </pre>
        )}
        <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#888888' }}>
          Please check the console for more information.
        </p>
      </div>
    </div>
  );
}
