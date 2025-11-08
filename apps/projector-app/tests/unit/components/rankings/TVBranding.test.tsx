import { describe, it, expect } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TVBranding } from '../../../../src/components/rankings/TVBranding';

describe('TVBranding', () => {
  it('should render without errors', () => {
    const { container } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );
    expect(container.querySelector('.tv-branding')).toBeTruthy();
  });

  it('should display logo with correct src', () => {
    const logoUrl = '/assets/show-logo.svg';
    const { container } = render(
      <TVBranding logoUrl={logoUrl} showLiveBadge={true} period="first-half" />
    );
    const logo = container.querySelector('.show-logo') as HTMLImageElement;
    expect(logo).toBeTruthy();
    expect(logo?.src).toContain('show-logo.svg');
  });

  it('should display live badge when showLiveBadge is true', () => {
    const { getByText } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );
    expect(getByText('生放送')).toBeTruthy();
  });

  it('should not display live badge when showLiveBadge is false', () => {
    const { queryByText } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={false}
        period="first-half"
      />
    );
    expect(queryByText('生放送')).toBeNull();
  });

  it('should display "前半" for first-half period', () => {
    const { getByText } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );
    expect(getByText('前半')).toBeTruthy();
  });

  it('should display "後半" for second-half period', () => {
    const { getByText } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="second-half"
      />
    );
    expect(getByText('後半')).toBeTruthy();
  });

  it('should not display period identifier when period is undefined', () => {
    const { queryByText } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period={undefined}
      />
    );
    expect(queryByText('前半')).toBeNull();
    expect(queryByText('後半')).toBeNull();
  });

  it('should show fallback SVG when image fails to load', async () => {
    const { container } = render(
      <TVBranding
        logoUrl="/invalid/path/to/logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );

    const logo = container.querySelector('.show-logo') as HTMLImageElement;

    // Simulate image load error
    fireEvent.error(logo);

    await waitFor(() => {
      const fallbackSvg = container.querySelector('.show-logo-fallback');
      expect(fallbackSvg).toBeTruthy();
    });
  });

  it('should maintain layout stability when logo fails to load', async () => {
    const { container } = render(
      <TVBranding
        logoUrl="/invalid/path/to/logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );

    const branding = container.querySelector('.tv-branding');
    expect(branding).toBeTruthy();

    const logo = container.querySelector('.show-logo') as HTMLImageElement;
    fireEvent.error(logo);

    await waitFor(() => {
      const fallbackSvg = container.querySelector('.show-logo-fallback');
      expect(fallbackSvg).toBeTruthy();
      // Layout should still exist
      expect(container.querySelector('.tv-branding')).toBeTruthy();
    });
  });

  it('should have correct layout structure with left, center, right sections', () => {
    const { container } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );

    expect(container.querySelector('.branding-left')).toBeTruthy();
    expect(container.querySelector('.branding-center')).toBeTruthy();
    expect(container.querySelector('.branding-right')).toBeTruthy();
  });

  it('should apply correct CSS classes to elements', () => {
    const { container } = render(
      <TVBranding
        logoUrl="/assets/show-logo.svg"
        showLiveBadge={true}
        period="first-half"
      />
    );

    expect(container.querySelector('.tv-branding')).toBeTruthy();
    expect(container.querySelector('.show-logo')).toBeTruthy();
    expect(container.querySelector('.live-badge')).toBeTruthy();
    expect(container.querySelector('.period-label')).toBeTruthy();
  });
});
