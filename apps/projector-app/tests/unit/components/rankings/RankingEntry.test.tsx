import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RankingEntry } from '../../../../src/components/rankings/RankingEntry';

describe('RankingEntry', () => {
  const defaultProps = {
    guestId: 'guest-1',
    rank: 1,
    displayName: '太郎(チームA)',
    responseTime: 1.5,
    isHighlighted: false,
    isPeriodChampion: false,
    shouldAnimate: false,
    animationDelay: 0,
    isWorst10: false,
  };

  it('should render without errors', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);
    expect(container.querySelector('.ranking-entry')).toBeTruthy();
  });

  it('should display rank number', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);
    const rankElement = container.querySelector('.rank-number');
    expect(rankElement?.textContent).toBe('1');
  });

  it('should display participant name', () => {
    const { getByText } = render(<RankingEntry {...defaultProps} />);
    expect(getByText('太郎(チームA)')).toBeTruthy();
  });

  it('should display response time with 2 decimals', () => {
    const { getByText } = render(<RankingEntry {...defaultProps} />);
    expect(getByText('1.50')).toBeTruthy();
  });

  it('should apply red background for highlighted worst entry', () => {
    const { container } = render(
      <RankingEntry
        {...defaultProps}
        isHighlighted={true}
        highlightColor="red"
      />
    );
    const entry = container.querySelector('.ranking-entry') as HTMLElement;
    expect(entry?.style.backgroundColor).toContain('239, 68, 68'); // rgba(239, 68, 68, 0.3)
  });

  it('should apply gold background for highlighted top entry', () => {
    const { container } = render(
      <RankingEntry
        {...defaultProps}
        isHighlighted={true}
        highlightColor="gold"
      />
    );
    const entry = container.querySelector('.ranking-entry') as HTMLElement;
    expect(entry?.style.backgroundColor).toContain('250, 204, 21'); // rgba(250, 204, 21, 0.3)
  });

  it('should apply default background for non-highlighted entry', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);
    const entry = container.querySelector('.ranking-entry') as HTMLElement;
    expect(entry?.style.backgroundColor).toContain('59, 130, 246'); // rgba(59, 130, 246, 0.2)
  });

  it('should show champion badge when isPeriodChampion is true', () => {
    const { container } = render(
      <RankingEntry {...defaultProps} isPeriodChampion={true} />
    );
    expect(container.querySelector('.champion-badge')).toBeTruthy();
  });

  it('should not show champion badge when isPeriodChampion is false', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);
    expect(container.querySelector('.champion-badge')).toBeNull();
  });

  it('should add animation class when shouldAnimate is true', () => {
    const { container } = render(
      <RankingEntry {...defaultProps} shouldAnimate={true} />
    );
    const entry = container.querySelector('.ranking-entry');
    expect(entry?.classList.contains('animate-fade-in-up')).toBe(true);
  });

  it('should not add animation class when shouldAnimate is false', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);
    const entry = container.querySelector('.ranking-entry');
    expect(entry?.classList.contains('animate-fade-in-up')).toBe(false);
  });

  it('should apply animation delay when shouldAnimate is true', () => {
    const { container } = render(
      <RankingEntry {...defaultProps} shouldAnimate={true} animationDelay={300} />
    );
    const entry = container.querySelector('.ranking-entry') as HTMLElement;
    expect(entry?.style.animationDelay).toBe('300ms');
  });

  it('should have minimum font sizes for projection readability', () => {
    const { container } = render(<RankingEntry {...defaultProps} />);

    const rankNumber = container.querySelector('.rank-number');
    const participantName = container.querySelector('.participant-name');
    const responseTime = container.querySelector('.response-time');

    expect(rankNumber).toBeTruthy();
    expect(participantName).toBeTruthy();
    expect(responseTime).toBeTruthy();
  });
});
