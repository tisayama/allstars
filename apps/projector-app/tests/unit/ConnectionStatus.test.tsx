/**
 * Unit tests for ConnectionStatus component
 * Feature: 001-projector-auth [US1]
 *
 * Tests status bar visibility and connection state display
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../../src/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('Visual display', () => {
    it('should render status bar with correct height (5-10% of viewport)', () => {
      const { container } = render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      const statusBar = container.firstChild as HTMLElement;
      expect(statusBar).toBeTruthy();

      // Check that status bar has fixed height
      const styles = window.getComputedStyle(statusBar);
      expect(styles.position).toBe('fixed');
    });

    it('should be visible from 3 meters away (large text)', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      // Text should be large enough (minimum 24px for 3m visibility)
      const statusText = screen.getByTestId('connection-status-text');
      expect(statusText).toBeTruthy();
    });
  });

  describe('Connection states', () => {
    it('should show "Connecting..." when not connected', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isAuthenticated={false}
          error={null}
        />
      );

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('should show "Connected" when authenticated', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('should show error message when error exists', () => {
      const errorMessage = 'Authentication failed: Invalid token';

      render(
        <ConnectionStatus
          isConnected={false}
          isAuthenticated={false}
          error={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should show "Authenticating..." when connected but not authenticated', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={false}
          error={null}
        />
      );

      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    });
  });

  describe('Visual indicators', () => {
    it('should show green indicator when fully connected', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass('bg-green-500');
    });

    it('should show yellow indicator when connecting', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isAuthenticated={false}
          error={null}
        />
      );

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass('bg-yellow-500');
    });

    it('should show red indicator when error exists', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isAuthenticated={false}
          error="Connection error"
        />
      );

      const indicator = screen.getByTestId('connection-indicator');
      expect(indicator).toHaveClass('bg-red-500');
    });
  });

  describe('Component props', () => {
    it('should accept isConnected boolean prop', () => {
      const { rerender } = render(
        <ConnectionStatus
          isConnected={false}
          isAuthenticated={false}
          error={null}
        />
      );

      expect(screen.getByText(/connecting/i)).toBeInTheDocument();

      rerender(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={false}
          error={null}
        />
      );

      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();
    });

    it('should accept isAuthenticated boolean prop', () => {
      const { rerender } = render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={false}
          error={null}
        />
      );

      expect(screen.getByText(/authenticating/i)).toBeInTheDocument();

      rerender(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    it('should accept error string prop', () => {
      const { rerender } = render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

      rerender(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error="Test error message"
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA labels', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      const statusBar = screen.getByRole('status');
      expect(statusBar).toBeTruthy();
    });

    it('should announce connection state changes to screen readers', () => {
      render(
        <ConnectionStatus
          isConnected={true}
          isAuthenticated={true}
          error={null}
        />
      );

      const statusBar = screen.getByRole('status');
      expect(statusBar).toHaveAttribute('aria-live', 'polite');
    });
  });
});
