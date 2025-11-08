import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RankingList } from '../../../../src/components/rankings/RankingList';
import type { RankingDisplayConfig } from '../../../../src/utils/rankingHelpers';

describe('RankingList', () => {
  const mockConfig: RankingDisplayConfig = {
    title: '早押しワースト10',
    entries: [
      {
        rank: 1,
        guestId: 'guest1',
        displayName: '太郎(チームA)',
        responseTime: 1.5,
        isHighlighted: false,
        isPeriodChampion: false,
      },
      {
        rank: 2,
        guestId: 'guest2',
        displayName: '花子(チームB)',
        responseTime: 2.3,
        isHighlighted: false,
        isPeriodChampion: false,
      },
      {
        rank: 3,
        guestId: 'guest3',
        displayName: '次郎(チームA)',
        responseTime: 3.1,
        isHighlighted: true,
        highlightColor: 'red',
        isPeriodChampion: false,
      },
    ],
    period: 'second-half',
    showPeriodChampions: false,
    periodChampions: [],
    type: 'worst10',
  };

  it('should render without errors', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    expect(container.querySelector('.ranking-list')).toBeTruthy();
  });

  it('should display vertical title', () => {
    const { getByText } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    expect(getByText('早押しワースト10')).toBeTruthy();
  });

  it('should apply ranking-label class for vertical layout', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    const label = container.querySelector('.ranking-label');
    expect(label).toBeTruthy();
    const verticalText = label?.querySelector('.vertical-text');
    expect(verticalText).toBeTruthy();
  });

  it('should render all ranking entries', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    const entries = container.querySelectorAll('.ranking-entry');
    expect(entries.length).toBe(3);
  });

  it('should pass correct props to RankingEntry components', () => {
    const { getByText } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    expect(getByText('太郎(チームA)')).toBeTruthy();
    expect(getByText('花子(チームB)')).toBeTruthy();
    expect(getByText('次郎(チームA)')).toBeTruthy();
  });

  it('should enable animations when animationsEnabled is true', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={true} />
    );
    const entries = container.querySelectorAll('.ranking-entry.animate-fade-in-up');
    expect(entries.length).toBe(3);
  });

  it('should disable animations when animationsEnabled is false', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    const entries = container.querySelectorAll('.ranking-entry.animate-fade-in-up');
    expect(entries.length).toBe(0);
  });

  it('should apply staggered animation delays when animations enabled', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={true} />
    );
    const entries = container.querySelectorAll('.ranking-entry') as NodeListOf<HTMLElement>;

    // First entry: 0ms delay
    expect(entries[0].style.animationDelay).toBe('0ms');

    // Second entry: 100ms delay
    expect(entries[1].style.animationDelay).toBe('100ms');

    // Third entry: 200ms delay
    expect(entries[2].style.animationDelay).toBe('200ms');
  });

  it('should handle edge case with less than 10 entries', () => {
    const shortConfig: RankingDisplayConfig = {
      title: '早押しトップ3',
      entries: [
        {
          rank: 1,
          guestId: 'guest1',
          displayName: 'Winner',
          responseTime: 0.5,
          isHighlighted: true,
          highlightColor: 'gold',
          isPeriodChampion: true,
        },
      ],
      period: 'first-half',
      showPeriodChampions: true,
      periodChampions: ['guest1'],
      type: 'top10',
    };

    const { container } = render(
      <RankingList config={shortConfig} animationsEnabled={false} />
    );
    const entries = container.querySelectorAll('.ranking-entry');
    expect(entries.length).toBe(1);
  });

  it('should render period champion badges when present', () => {
    const championConfig: RankingDisplayConfig = {
      title: '早押しトップ10',
      entries: [
        {
          rank: 1,
          guestId: 'champion1',
          displayName: 'チャンピオン',
          responseTime: 0.8,
          isHighlighted: true,
          highlightColor: 'gold',
          isPeriodChampion: true,
        },
      ],
      period: 'second-half',
      showPeriodChampions: true,
      periodChampions: ['champion1'],
      type: 'top10',
    };

    const { container } = render(
      <RankingList config={championConfig} animationsEnabled={false} />
    );
    expect(container.querySelector('.champion-badge')).toBeTruthy();
  });

  it('should apply highlighting to specified entries', () => {
    const { container } = render(
      <RankingList config={mockConfig} animationsEnabled={false} />
    );
    const entries = container.querySelectorAll('.ranking-entry') as NodeListOf<HTMLElement>;

    // Third entry should be highlighted with red
    expect(entries[2].style.backgroundColor).toContain('239, 68, 68');
  });
});
