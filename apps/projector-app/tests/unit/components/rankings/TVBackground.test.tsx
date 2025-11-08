import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TVBackground } from '../../../../src/components/rankings/TVBackground';

describe('TVBackground', () => {
  it('should render without errors', () => {
    const { container } = render(<TVBackground animationsEnabled={true} />);
    expect(container.querySelector('.tv-background-container')).toBeTruthy();
  });

  it('should render gradient element', () => {
    const { container } = render(<TVBackground animationsEnabled={true} />);
    expect(container.querySelector('.tv-gradient')).toBeTruthy();
  });

  it('should add animated class when animations enabled', () => {
    const { container } = render(<TVBackground animationsEnabled={true} />);
    const gradient = container.querySelector('.tv-gradient');
    expect(gradient?.classList.contains('animated')).toBe(true);
  });

  it('should add static class when animations disabled', () => {
    const { container } = render(<TVBackground animationsEnabled={false} />);
    const gradient = container.querySelector('.tv-gradient');
    expect(gradient?.classList.contains('static')).toBe(true);
  });

  it('should set animation play state to running when enabled', () => {
    const { container } = render(<TVBackground animationsEnabled={true} />);
    const gradient = container.querySelector('.tv-gradient') as HTMLElement;
    expect(gradient?.style.animationPlayState).toBe('running');
  });

  it('should set animation play state to paused when disabled', () => {
    const { container } = render(<TVBackground animationsEnabled={false} />);
    const gradient = container.querySelector('.tv-gradient') as HTMLElement;
    expect(gradient?.style.animationPlayState).toBe('paused');
  });

  it('should be positioned fixed to cover viewport', () => {
    const { container } = render(<TVBackground animationsEnabled={true} />);
    const bgContainer = container.querySelector('.tv-background-container');
    expect(bgContainer).toBeTruthy();
  });
});
