import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingsDisplay } from '@/components/display/RankingsDisplay';
import type { GameResults, RankedAnswer } from '@allstars/types';

describe('RankingsDisplay', () => {
  const mockTop10: RankedAnswer[] = [
    { guestId: 'g1', guestName: 'Alice', responseTimeMs: 1500 },
    { guestId: 'g2', guestName: 'Bob', responseTimeMs: 2000 },
    { guestId: 'g3', guestName: 'Charlie', responseTimeMs: 2500 },
  ];

  const mockWorst10: RankedAnswer[] = [
    { guestId: 'g4', guestName: 'David', responseTimeMs: 10000 },
    { guestId: 'g5', guestName: 'Eve', responseTimeMs: 12000 },
  ];

  describe('Non-final questions (isGongActive: false)', () => {
    const results: GameResults = {
      top10: mockTop10,
      worst10: mockWorst10,
    };

    it('should render Worst 10 section header', () => {
      render(<RankingsDisplay results={results} isGongActive={false} />);

      expect(screen.getByText(/Worst 10 \(Slowest Correct\)/i)).toBeInTheDocument();
    });

    it('should NOT render Top 10 section header', () => {
      render(<RankingsDisplay results={results} isGongActive={false} />);

      expect(screen.queryByText(/Top 10 \(Fastest Correct\)/i)).not.toBeInTheDocument();
    });

    it('should display all worst 10 entries with names and times', () => {
      render(<RankingsDisplay results={results} isGongActive={false} />);

      expect(screen.getByText('David')).toBeInTheDocument();
      expect(screen.getByText('10.00s')).toBeInTheDocument();

      expect(screen.getByText('Eve')).toBeInTheDocument();
      expect(screen.getByText('12.00s')).toBeInTheDocument();
    });

    it('should handle empty worst10 array', () => {
      const emptyResults: GameResults = {
        top10: mockTop10,
        worst10: [],
      };

      render(<RankingsDisplay results={emptyResults} isGongActive={false} />);

      expect(screen.getByText('No entries')).toBeInTheDocument();
    });
  });

  describe('Period-final questions (isGongActive: true)', () => {
    const results: GameResults = {
      top10: mockTop10,
      worst10: mockWorst10,
      periodChampions: ['g1'],
      period: 'first-half',
    };

    it('should render Top 10 section header', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.getByText(/Top 10 \(Fastest Correct\)/i)).toBeInTheDocument();
    });

    it('should NOT render Worst 10 section header', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.queryByText(/Worst 10 \(Slowest Correct\)/i)).not.toBeInTheDocument();
    });

    it('should display all top 10 entries with names and times', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('1.50s')).toBeInTheDocument();

      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('2.00s')).toBeInTheDocument();

      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('2.50s')).toBeInTheDocument();
    });

    it('should display period champion badge', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      // Check for crown emoji
      expect(screen.getByText('👑')).toBeInTheDocument();
    });

    it('should display period label', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.getByText(/First Half Final/i)).toBeInTheDocument();
    });

    it('should display champion count badge', () => {
      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.getByText('1 Champion')).toBeInTheDocument();
    });

    it('should handle multiple period champions (tied fastest)', () => {
      const tiedResults: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
        periodChampions: ['g1', 'g2', 'g3'],
        period: 'first-half',
      };

      render(<RankingsDisplay results={tiedResults} isGongActive={true} />);

      // Should have 3 crown emojis
      const crowns = screen.getAllByText('👑');
      expect(crowns).toHaveLength(3);

      // Should show plural
      expect(screen.getByText('3 Champions')).toBeInTheDocument();
    });

    it('should display second-half period label correctly', () => {
      const secondHalfResults: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
        periodChampions: ['g1'],
        period: 'second-half',
      };

      render(<RankingsDisplay results={secondHalfResults} isGongActive={true} />);

      expect(screen.getByText(/Second Half Final/i)).toBeInTheDocument();
    });

    it('should handle empty top10 array', () => {
      const emptyResults: GameResults = {
        top10: [],
        worst10: mockWorst10,
        periodChampions: [],
        period: 'first-half',
      };

      render(<RankingsDisplay results={emptyResults} isGongActive={true} />);

      expect(screen.getByText('No correct answers')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('should display ranking error warning when rankingError is true', () => {
      const errorResults: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
        rankingError: true,
      };

      render(<RankingsDisplay results={errorResults} isGongActive={false} />);

      expect(screen.getByText(/Ranking Calculation Incomplete/i)).toBeInTheDocument();
    });

    it('should not display ranking error warning when rankingError is false', () => {
      const results: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
        rankingError: false,
      };

      render(<RankingsDisplay results={results} isGongActive={false} />);

      expect(screen.queryByText(/Ranking Calculation Incomplete/i)).not.toBeInTheDocument();
    });

    it('should display detailed error message with guidance', () => {
      const errorResults: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
        rankingError: true,
      };

      render(<RankingsDisplay results={errorResults} isGongActive={false} />);

      expect(screen.getByText(/rankings may not be accurate/i)).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should format response times correctly to 2 decimal places', () => {
      const preciseResults: GameResults = {
        top10: [{ guestId: 'g1', guestName: 'Alice', responseTimeMs: 1234 }],
        worst10: [],
      };

      render(<RankingsDisplay results={preciseResults} isGongActive={true} />);

      expect(screen.getByText('1.23s')).toBeInTheDocument();
    });

    it('should display rank numbers with # prefix', () => {
      const results: GameResults = {
        top10: mockTop10,
        worst10: mockWorst10,
      };

      render(<RankingsDisplay results={results} isGongActive={true} />);

      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText('#2')).toBeInTheDocument();
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });
});
