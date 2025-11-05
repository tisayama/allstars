import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowingResultsPhase } from '@/components/phases/ShowingResultsPhase';
import type { GameState, GameResults, RankedAnswer } from '@/types';

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

  it('should render the results title', () => {
    render(<ShowingResultsPhase gameState={mockGameState} />);

    expect(screen.getByText('Results')).toBeInTheDocument();
  });

  describe('Non-final questions (isGongActive: false)', () => {
    const nonFinalGameState: GameState = {
      ...mockGameState,
      isGongActive: false,
    };

    it('should render worst 10 section header', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} />);

      expect(screen.getByText(/Worst 10 \(Slowest Correct\)/i)).toBeInTheDocument();
    });

    it('should NOT render top 10 section header', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} />);

      expect(screen.queryByText(/Top 10 \(Fastest Correct\)/i)).not.toBeInTheDocument();
    });

    it('should display all worst 10 entries with names and times', () => {
      render(<ShowingResultsPhase gameState={nonFinalGameState} />);

      expect(screen.getByText(/1\.\s*David/)).toBeInTheDocument();
      expect(screen.getByText(/2\.\s*Eve/)).toBeInTheDocument();

      expect(screen.getByText('10.00s')).toBeInTheDocument();
      expect(screen.getByText('12.00s')).toBeInTheDocument();
    });

    it('should handle empty worst10 array', () => {
      const gameStateWithEmptyWorst10: GameState = {
        ...nonFinalGameState,
        results: {
          top10: mockResults.top10,
          worst10: [],
        },
      };

      render(<ShowingResultsPhase gameState={gameStateWithEmptyWorst10} />);

      expect(screen.getByText('No entries')).toBeInTheDocument();
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

    it('should render top 10 section header', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} />);

      expect(screen.getByText(/Top 10 \(Fastest Correct\)/i)).toBeInTheDocument();
    });

    it('should NOT render worst 10 section header', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} />);

      expect(screen.queryByText(/Worst 10 \(Slowest\/Incorrect\)/i)).not.toBeInTheDocument();
    });

    it('should display all top 10 entries with names and times', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} />);

      expect(screen.getByText(/1\.\s*Alice/)).toBeInTheDocument();
      expect(screen.getByText(/2\.\s*Bob/)).toBeInTheDocument();
      expect(screen.getByText(/3\.\s*Charlie/)).toBeInTheDocument();

      expect(screen.getByText('1.50s')).toBeInTheDocument();
      expect(screen.getByText('2.00s')).toBeInTheDocument();
      expect(screen.getByText('2.50s')).toBeInTheDocument();
    });

    it('should handle empty top10 array', () => {
      const gameStateWithEmptyTop10: GameState = {
        ...periodFinalGameState,
        results: {
          top10: [],
          worst10: mockResults.worst10,
        },
      };

      render(<ShowingResultsPhase gameState={gameStateWithEmptyTop10} />);

      expect(screen.getByText('No correct answers')).toBeInTheDocument();
    });

    it('should display period champion badge', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} />);

      // Check for crown emoji
      expect(screen.getByText('👑')).toBeInTheDocument();
    });

    it('should display period label in title', () => {
      render(<ShowingResultsPhase gameState={periodFinalGameState} />);

      expect(screen.getByText(/First Half Final/i)).toBeInTheDocument();
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

      render(<ShowingResultsPhase gameState={gameStateWithTiedChampions} />);

      // Should have 3 crown emojis
      const crowns = screen.getAllByText('👑');
      expect(crowns).toHaveLength(3);
    });

    it('should display second-half period label correctly', () => {
      const secondHalfGameState: GameState = {
        ...periodFinalGameState,
        results: {
          top10: periodFinalGameState.results!.top10,
          worst10: periodFinalGameState.results!.worst10,
          periodChampions: periodFinalGameState.results!.periodChampions,
          period: 'second-half',
        },
      };

      render(<ShowingResultsPhase gameState={secondHalfGameState} />);

      expect(screen.getByText(/Second Half Final/i)).toBeInTheDocument();
    });
  });

  it('should show error when results is null', () => {
    const gameStateWithoutResults: GameState = {
      ...mockGameState,
      results: null,
    };

    render(<ShowingResultsPhase gameState={gameStateWithoutResults} />);

    expect(screen.getByText('Error: No results data available')).toBeInTheDocument();
  });

  it('should display ranking error warning when rankingError is true', () => {
    const gameStateWithRankingError: GameState = {
      ...mockGameState,
      results: {
        ...mockResults,
        rankingError: true,
      },
    };

    render(<ShowingResultsPhase gameState={gameStateWithRankingError} />);

    expect(screen.getByText('Warning: Ranking calculation incomplete')).toBeInTheDocument();
  });

  it('should not display ranking error warning when rankingError is false', () => {
    const gameStateWithoutRankingError: GameState = {
      ...mockGameState,
      results: {
        ...mockResults,
        rankingError: false,
      },
    };

    render(<ShowingResultsPhase gameState={gameStateWithoutRankingError} />);

    expect(screen.queryByText('Warning: Ranking calculation incomplete')).not.toBeInTheDocument();
  });

  it('should format response times correctly to 2 decimal places', () => {
    const gameStateWithPreciseTime: GameState = {
      ...mockGameState,
      isGongActive: true, // Show top 10
      results: {
        top10: [{ guestId: 'g1', guestName: 'Alice', responseTimeMs: 1234 }],
        worst10: [],
      },
    };

    render(<ShowingResultsPhase gameState={gameStateWithPreciseTime} />);

    expect(screen.getByText('1.23s')).toBeInTheDocument();
  });
});
