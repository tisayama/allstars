import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TVRankingDisplay } from '../../../../src/components/rankings/TVRankingDisplay';
import type { GameResults } from '@allstars/types';

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
};

// Mock game results
const mockGameResults: GameResults = {
  worst10: [
    {
      guestId: 'g1',
      guestName: '太郎(チームA)',
      responseTimeMs: 1500,
    },
    {
      guestId: 'g2',
      guestName: '花子(チームB)',
      responseTimeMs: 2300,
    },
    {
      guestId: 'g3',
      guestName: '次郎(チームA)',
      responseTimeMs: 3100,
    },
  ],
  top10: [
    {
      guestId: 'g10',
      guestName: 'Winner(チームA)',
      responseTimeMs: 500,
    },
  ],
  period: 'first-half',
};

describe('TVRankingDisplay', () => {
  it('should render without errors', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(container.querySelector('.tv-ranking-container')).toBeTruthy();
  });

  it('should render TV background', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(container.querySelector('.tv-background-container')).toBeTruthy();
  });

  it('should render TV branding', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(container.querySelector('.tv-branding')).toBeTruthy();
  });

  it('should render worst10 rankings', () => {
    const { getByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(getByText('早押しワースト10')).toBeTruthy();
    expect(getByText('太郎(チームA)')).toBeTruthy();
  });

  it('should NOT render top10 rankings when isGongActive is false', () => {
    const { queryByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(queryByText('早押しトップ10')).toBeNull();
  });

  it('should render top10 rankings when isGongActive is true', () => {
    const { getByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={true}
        socket={mockSocket as any}
      />
    );
    expect(getByText('早押しトップ10')).toBeTruthy();
    expect(getByText('Winner(チームA)')).toBeTruthy();
  });

  it('should render both worst10 and top10 when isGongActive is true', () => {
    const { getByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={true}
        socket={mockSocket as any}
      />
    );
    expect(getByText('早押しワースト10')).toBeTruthy();
    expect(getByText('早押しトップ10')).toBeTruthy();
  });

  it('should display period label based on results', () => {
    const { getByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(getByText('前半')).toBeTruthy();
  });

  it('should handle ceremony period correctly', () => {
    const ceremonyResults = { ...mockGameResults, period: 'second-half' as const };
    const { getByText } = render(
      <TVRankingDisplay
        results={ceremonyResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(getByText('後半')).toBeTruthy();
  });

  it('should render live badge', () => {
    const { getByText } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(getByText('生放送')).toBeTruthy();
  });

  it('should handle null socket gracefully', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={null}
      />
    );
    expect(container.querySelector('.tv-ranking-container')).toBeTruthy();
  });

  it('should handle undefined results gracefully', () => {
    const { container } = render(
      <TVRankingDisplay
        results={undefined as any}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    // Should render but with empty rankings
    expect(container.querySelector('.tv-ranking-container')).toBeTruthy();
  });

  it('should apply correct layout classes', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(container.querySelector('.tv-ranking-container')).toBeTruthy();
    expect(container.querySelector('.rankings-content')).toBeTruthy();
  });

  it('should render show logo', () => {
    const { container } = render(
      <TVRankingDisplay
        results={mockGameResults}
        isGongActive={false}
        socket={mockSocket as any}
      />
    );
    expect(container.querySelector('.show-logo')).toBeTruthy();
  });
});
