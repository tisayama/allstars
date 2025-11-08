import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowingResultsPhase } from '@/components/phases/ShowingResultsPhase';
import type { GameState, GameResults, RankedAnswer } from '@/types';

// Mock socket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  connected: true,
};

describe('ShowingResultsPhase', () => {
  const mockResults: GameResults = {
    top10: [
      { guestId: 'g1', guestName: 'Alice', responseTimeMs: 1500 },
      { guestId: 'g2', guestName: 'Bob', responseTimeMs: 2000 },
      { guestId: 'g3', guestName: 'Charlie', responseTimeMs: 2500 },
    ] as RankedAnswer[],
    worst10: [
      { guestId: 'g4', guestName: 'David', responseTimeMs: 10000 },
      { guestId: 'g5', guestName: 'Eve', responseTimeMs: 12000 },
    ] as RankedAnswer[],
  };

  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'showing_results',
    currentQuestion: null,
    isGongActive: false,
    results: mockResults,
    prizeCarryover: 0,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render TV ranking display container', () => {
    render(<ShowingResultsPhase gameState={mockGameState} socket={mockSocket as any} />);

    const container = document.querySelector('.tv-ranking-container');
    expect(container).toBeTruthy();
  });

  describe('Non-final questions (isGongActive: false)', () => {
    const nonFinalGameState: GameState = {
      ...mockGameState,
      isGongActive: false,
    };

    it('should render worst 10 section with Japanese label', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} socket={mockSocket as any} />);

      expect(screen.getByText('早押しワースト10')).toBeInTheDocument();
    });

    it('should NOT render top 10 section', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} socket={mockSocket as any} />);

      expect(screen.queryByText('早押しトップ10')).not.toBeInTheDocument();
    });

    it('should display all worst 10 entries with names and times', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} socket={mockSocket as any} />);

      expect(screen.getByText('David')).toBeInTheDocument();
      expect(screen.getByText('Eve')).toBeInTheDocument();
      expect(screen.getByText('10.00')).toBeInTheDocument();
      expect(screen.getByText('12.00')).toBeInTheDocument();
    });

    it('should handle empty worst10 array', () => {
      const gameStateWithEmptyWorst10: GameState = {
        ...nonFinalGameState,
        results: {
          top10: mockResults.top10,
          worst10: [],
        },
      };

      const { container } = render(
        <ShowingResultsPhase gameState={gameStateWithEmptyWorst10} socket={mockSocket as any} />
      );

      // Should still render worst10 section but with no entries
      expect(screen.getByText('早押しワースト10')).toBeInTheDocument();
      const rankingEntries = container.querySelector('.ranking-entries');
      expect(rankingEntries?.children.length).toBe(0);
    });
  });

  describe('Period-final questions (isGongActive: true)', () => {
    const periodFinalGameState: GameState = {
      ...mockGameState,
      isGongActive: true,
      results: {
        ...mockResults,
        periodChampions: ['g1'],
        period: 'first-half',
      },
    };

    it('should render BOTH worst 10 and top 10 sections', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} socket={mockSocket as any} />);

      expect(screen.getByText('早押しワースト10')).toBeInTheDocument();
      expect(screen.getByText('早押しトップ10')).toBeInTheDocument();
    });

    it('should display all top 10 entries with names and times', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} socket={mockSocket as any} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('1.50')).toBeInTheDocument();
      expect(screen.getByText('2.00')).toBeInTheDocument();
      expect(screen.getByText('2.50')).toBeInTheDocument();
    });

    it('should display worst 10 entries even when top 10 is shown', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} socket={mockSocket as any} />);

      // Verify worst 10 is also rendered
      expect(screen.getByText('David')).toBeInTheDocument();
      expect(screen.getByText('Eve')).toBeInTheDocument();
    });

    it('should handle empty top10 array', () => {
      const gameStateWithEmptyTop10: GameState = {
        ...periodFinalGameState,
        results: {
          top10: [],
          worst10: mockResults.worst10,
        },
      };

      render(<ShowingResultsPhase gameState={gameStateWithEmptyTop10} socket={mockSocket as any} />);

      // Should render worst10 but not top10 (since top10 is empty)
      expect(screen.getByText('早押しワースト10')).toBeInTheDocument();
      expect(screen.queryByText('早押しトップ10')).not.toBeInTheDocument();
    });

    it('should display period champion badge', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} socket={mockSocket as any} />);

      // Check for star badge (period champion indicator)
      expect(screen.getByText('★')).toBeInTheDocument();
    });

    it('should display period label based on results', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} socket={mockSocket as any} />);

      // Period label should be '前半' for 'first-half'
      expect(screen.getByText('前半')).toBeInTheDocument();
    });

    it('should handle second-half period correctly', () => {
      const secondHalfGameState: GameState = {
        ...periodFinalGameState,
        results: {
          ...periodFinalGameState.results!,
          period: 'second-half',
        },
      };

      render(<ShowingResultsPhase gameState={secondHalfGameState} socket={mockSocket as any} />);

      // Period label should be '後半' for 'second-half'
      expect(screen.getByText('後半')).toBeInTheDocument();
    });

    it('should handle multiple period champions (tied fastest)', () => {
      const gameStateWithTiedChampions: GameState = {
        ...periodFinalGameState,
        results: {
          top10: periodFinalGameState.results!.top10,
          worst10: periodFinalGameState.results!.worst10,
          periodChampions: ['g1', 'g2', 'g3'],
          period: periodFinalGameState.results!.period,
        },
      };

      render(<ShowingResultsPhase gameState={gameStateWithTiedChampions} socket={mockSocket as any} />);

      // Should have 3 star badges
      const stars = screen.getAllByText('★');
      expect(stars).toHaveLength(3);
    });
  });

  it('should render TV branding with live badge', () => {
    render(<ShowingResultsPhase gameState={mockGameState} socket={mockSocket as any} />);

    expect(screen.getByText('生放送')).toBeInTheDocument();
  });

  it('should render with null socket gracefully', () => {
    const { container } = render(<ShowingResultsPhase gameState={mockGameState} socket={null} />);

    expect(container.querySelector('.tv-ranking-container')).toBeTruthy();
  });

  it('should delegate to TVRankingDisplay component', () => {
    const { container } = render(<ShowingResultsPhase gameState={mockGameState} socket={mockSocket as any} />);

    // Verify key TV ranking components are rendered
    expect(container.querySelector('.tv-background-container')).toBeTruthy();
    expect(container.querySelector('.tv-branding')).toBeTruthy();
    expect(container.querySelector('.ranking-list')).toBeTruthy();
  });
});
