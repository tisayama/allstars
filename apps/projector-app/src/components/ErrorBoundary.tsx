import { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info for display
    this.setState({
      errorInfo,
    });

    // In production, you might want to log this to an error reporting service
    // Example: logErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                color: '#ef4444',
              }}
            >
              Something went wrong
            </h1>

            <div
              style={{
                marginBottom: '1.5rem',
              }}
            >
              <p
                style={{
                  fontSize: '1rem',
                  marginBottom: '0.5rem',
                  color: '#d1d5db',
                }}
              >
                The application encountered an unexpected error. Please refresh the page to
                continue.
              </p>
            </div>

            {error && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '1rem',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '4px',
                  borderLeft: '4px solid #ef4444',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    color: '#fca5a5',
                  }}
                >
                  Error Message:
                </p>
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#ffffff',
                    wordBreak: 'break-word',
                  }}
                >
                  {error.message || 'Unknown error'}
                </p>
              </div>
            )}

            {errorInfo && import.meta.env.DEV && (
              <details
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#1a1a1a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <summary
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: '#9ca3af',
                    marginBottom: '0.5rem',
                  }}
                >
                  Component Stack (Development Only)
                </summary>
                <pre
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#d1d5db',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '0.5rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
