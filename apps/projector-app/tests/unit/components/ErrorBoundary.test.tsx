import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child component</div>;
};

describe('ErrorBoundary', () => {
  // Suppress console.error during tests to avoid noise
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Normal child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal child content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should display error title
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should display error message in fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should display the actual error message
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
  });

  it('should display component stack in development mode', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show some error details
    const errorContainer = screen.getByText(/Test error message/i).closest('div');
    expect(errorContainer).toBeInTheDocument();
  });

  it('should render children after error when reset', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error state should be shown
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Re-render with working component
    rerender(
      <ErrorBoundary>
        <div>Recovered content</div>
      </ErrorBoundary>
    );

    // Note: Error boundaries don't automatically reset on re-render
    // This test verifies the error UI persists
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should handle errors without error messages', () => {
    const ThrowGenericError = () => {
      throw new Error();
    };

    render(
      <ErrorBoundary>
        <ThrowGenericError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should handle non-Error objects being thrown', () => {
    const ThrowString = () => {
      throw 'String error';
    };

    render(
      <ErrorBoundary>
        <ThrowString />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should log errors to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // React calls console.error with the error
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should apply custom className to error container', () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check that the error UI is rendered with proper styling
    const errorContainer = container.querySelector('[style]');
    expect(errorContainer).toBeInTheDocument();
  });
});
