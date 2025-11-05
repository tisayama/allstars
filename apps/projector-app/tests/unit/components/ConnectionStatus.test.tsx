import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '@/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('should render both connection indicators', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={true}
      />
    );

    expect(screen.getByText(/Firestore/i)).toBeInTheDocument();
    expect(screen.getByText(/WebSocket/i)).toBeInTheDocument();
  });

  it('should show connected status for Firestore when connected', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={false}
        websocketAuthenticated={false}
      />
    );

    const firestoreIndicator = screen.getByText(/Firestore/i).closest('div');
    expect(firestoreIndicator).toHaveTextContent(/connected/i);
  });

  it('should show disconnected status for Firestore when not connected', () => {
    render(
      <ConnectionStatus
        firestoreConnected={false}
        websocketConnected={false}
        websocketAuthenticated={false}
      />
    );

    const firestoreIndicator = screen.getByText(/Firestore/i).closest('div');
    expect(firestoreIndicator).toHaveTextContent(/disconnected/i);
  });

  it('should show connected status for WebSocket when connected and authenticated', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={true}
      />
    );

    const websocketIndicator = screen.getByText(/WebSocket/i).closest('div');
    expect(websocketIndicator).toHaveTextContent(/connected/i);
  });

  it('should show authenticating status when connected but not authenticated', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={false}
      />
    );

    const websocketIndicator = screen.getByText(/WebSocket/i).closest('div');
    expect(websocketIndicator).toHaveTextContent(/authenticating/i);
  });

  it('should show disconnected status for WebSocket when not connected', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={false}
        websocketAuthenticated={false}
      />
    );

    const websocketIndicator = screen.getByText(/WebSocket/i).closest('div');
    expect(websocketIndicator).toHaveTextContent(/disconnected/i);
  });

  it('should display error message when provided', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={false}
        websocketAuthenticated={false}
        error="Connection failed: timeout"
      />
    );

    expect(screen.getByText(/Connection failed: timeout/i)).toBeInTheDocument();
  });

  it('should not display error message when not provided', () => {
    render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={true}
      />
    );

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('should apply different styles for connected and disconnected states', () => {
    const { rerender } = render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={true}
      />
    );

    const firestoreIndicator = screen.getByText(/Firestore/i).closest('div');
    const connectedClass = firestoreIndicator?.className;

    rerender(
      <ConnectionStatus
        firestoreConnected={false}
        websocketConnected={false}
        websocketAuthenticated={false}
      />
    );

    const disconnectedClass = firestoreIndicator?.className;

    // Classes should be different for connected vs disconnected
    expect(connectedClass).not.toBe(disconnectedClass);
  });

  it('should be positioned in bottom-right corner', () => {
    const { container } = render(
      <ConnectionStatus
        firestoreConnected={true}
        websocketConnected={true}
        websocketAuthenticated={true}
      />
    );

    const statusContainer = container.firstChild as HTMLElement;
    expect(statusContainer).toHaveStyle({ position: 'fixed' });
  });
});
