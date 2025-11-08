import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConnectionIndicator } from '../../../../src/components/rankings/ConnectionIndicator';

describe('ConnectionIndicator', () => {
  it('should render when visible', () => {
    const { container } = render(<ConnectionIndicator isVisible={true} />);

    expect(container.querySelector('.connection-indicator')).toBeTruthy();
  });

  it('should not render when not visible', () => {
    const { container } = render(<ConnectionIndicator isVisible={false} />);

    expect(container.querySelector('.connection-indicator')).toBeNull();
  });

  it('should display alert icon', () => {
    const { container } = render(<ConnectionIndicator isVisible={true} />);

    const icon = container.querySelector('.indicator-icon');
    expect(icon).toBeTruthy();
    expect(icon?.textContent).toBe('⚠️');
  });

  it('should display disconnected message', () => {
    const { getByText } = render(<ConnectionIndicator isVisible={true} />);

    expect(getByText('接続が切断されました')).toBeTruthy();
  });

  it('should apply correct CSS classes', () => {
    const { container } = render(<ConnectionIndicator isVisible={true} />);

    const indicator = container.querySelector('.connection-indicator');
    expect(indicator).toBeTruthy();
    expect(indicator?.classList.contains('connection-indicator')).toBe(true);

    const icon = container.querySelector('.indicator-icon');
    expect(icon).toBeTruthy();

    const text = container.querySelector('.indicator-text');
    expect(text).toBeTruthy();
  });

  it('should be accessible with proper structure', () => {
    const { container } = render(<ConnectionIndicator isVisible={true} />);

    const indicator = container.querySelector('.connection-indicator');
    expect(indicator).toBeTruthy();

    // Should have icon and text as children
    const children = indicator?.children;
    expect(children?.length).toBe(2);
  });
});
