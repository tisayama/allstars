import { describe, it, expect } from 'vitest';
import {
  truncate,
  msToSeconds,
  shouldHighlight,
  getHighlightColor,
  toRankingEntry,
  createWorst10Config,
  createTop10Config,
} from '../../../src/utils/rankingHelpers';
import type { RankedAnswer, GameResults } from '@allstars/types';

describe('rankingHelpers', () => {
  describe('truncate', () => {
    it('should return string unchanged if within max length', () => {
      expect(truncate('John Doe', 10)).toBe('John Doe');
    });

    it('should return string unchanged if exactly max length', () => {
      expect(truncate('1234567890', 10)).toBe('1234567890');
    });

    it('should truncate and add ellipsis if exceeds max length', () => {
      expect(truncate('This is a very long name that exceeds limit', 20)).toBe(
        'This is a very long…'
      );
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle Japanese characters', () => {
      const longName = '土屋桂子(ウィッツ)とても長い名前です';
      const result = truncate(longName, 15);
      expect(result.length).toBe(15);
      expect(result.endsWith('…')).toBe(true);
    });
  });

  describe('msToSeconds', () => {
    it('should convert milliseconds to seconds with 2 decimals', () => {
      expect(msToSeconds(1500)).toBe(1.5);
    });

    it('should round to 2 decimal places', () => {
      expect(msToSeconds(1234)).toBe(1.23);
    });

    it('should handle zero', () => {
      expect(msToSeconds(0)).toBe(0.0);
    });

    it('should handle large numbers', () => {
      expect(msToSeconds(123456)).toBe(123.46);
    });

    it('should handle fractional milliseconds', () => {
      expect(msToSeconds(999.9)).toBe(1.0);
    });
  });

  describe('shouldHighlight', () => {
    it('should highlight last entry for worst10 type', () => {
      expect(shouldHighlight(9, 10, 'worst10')).toBe(true);
    });

    it('should not highlight other entries for worst10 type', () => {
      expect(shouldHighlight(0, 10, 'worst10')).toBe(false);
      expect(shouldHighlight(5, 10, 'worst10')).toBe(false);
      expect(shouldHighlight(8, 10, 'worst10')).toBe(false);
    });

    it('should highlight first entry for top10 type', () => {
      expect(shouldHighlight(0, 10, 'top10')).toBe(true);
    });

    it('should not highlight other entries for top10 type', () => {
      expect(shouldHighlight(1, 10, 'top10')).toBe(false);
      expect(shouldHighlight(5, 10, 'top10')).toBe(false);
      expect(shouldHighlight(9, 10, 'top10')).toBe(false);
    });

    it('should work with fewer than 10 entries', () => {
      expect(shouldHighlight(4, 5, 'worst10')).toBe(true);
      expect(shouldHighlight(0, 3, 'top10')).toBe(true);
    });
  });

  describe('getHighlightColor', () => {
    it('should return red for highlighted worst10', () => {
      expect(getHighlightColor('worst10', true)).toBe('red');
    });

    it('should return gold for highlighted top10', () => {
      expect(getHighlightColor('top10', true)).toBe('gold');
    });

    it('should return undefined for non-highlighted entries', () => {
      expect(getHighlightColor('worst10', false)).toBeUndefined();
      expect(getHighlightColor('top10', false)).toBeUndefined();
    });
  });

  describe('toRankingEntry', () => {
    const mockRankedAnswer: RankedAnswer = {
      guestId: 'guest-123',
      guestName: '土屋桂子(ウィッツ)',
      responseTimeMs: 1500,
    };

    it('should transform RankedAnswer to RankingEntry', () => {
      const result = toRankingEntry(mockRankedAnswer, 1, false, undefined);

      expect(result).toEqual({
        rank: 1,
        guestId: 'guest-123',
        displayName: '土屋桂子(ウィッツ)',
        responseTime: 1.5,
        isHighlighted: false,
        highlightColor: undefined,
        isPeriodChampion: false,
      });
    });

    it('should apply highlighting correctly', () => {
      const result = toRankingEntry(mockRankedAnswer, 10, true, 'red');

      expect(result.isHighlighted).toBe(true);
      expect(result.highlightColor).toBe('red');
    });

    it('should mark period champions correctly', () => {
      const result = toRankingEntry(
        mockRankedAnswer,
        1,
        true,
        'gold',
        ['guest-123']
      );

      expect(result.isPeriodChampion).toBe(true);
    });

    it('should truncate long names to 50 characters', () => {
      const longName =
        'A'.repeat(60); // Create a 60-character string
      const longAnswer: RankedAnswer = {
        ...mockRankedAnswer,
        guestName: longName,
      };

      const result = toRankingEntry(longAnswer, 1, false, undefined);

      expect(result.displayName.length).toBe(50);
      expect(result.displayName.endsWith('…')).toBe(true);
    });

    it('should convert response time to seconds with 2 decimals', () => {
      const answer: RankedAnswer = {
        ...mockRankedAnswer,
        responseTimeMs: 2340,
      };

      const result = toRankingEntry(answer, 1, false, undefined);

      expect(result.responseTime).toBe(2.34);
    });
  });

  describe('createWorst10Config', () => {
    const mockGameResults: GameResults = {
      worst10: [
        {
          guestId: 'guest-1',
          guestName: '太郎(チームA)',
          responseTimeMs: 1000,
        },
        {
          guestId: 'guest-2',
          guestName: '花子(チームB)',
          responseTimeMs: 2000,
        },
        {
          guestId: 'guest-3',
          guestName: '次郎(チームC)',
          responseTimeMs: 3000,
        },
      ],
      top10: [],
      period: 'first-half',
      periodChampions: ['guest-1'],
    };

    it('should create worst10 config with correct title', () => {
      const result = createWorst10Config(mockGameResults);

      expect(result.title).toBe('早押しワースト10');
      expect(result.type).toBe('worst10');
    });

    it('should transform all worst10 entries', () => {
      const result = createWorst10Config(mockGameResults);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[2].rank).toBe(3);
    });

    it('should highlight last entry with red color', () => {
      const result = createWorst10Config(mockGameResults);

      expect(result.entries[2].isHighlighted).toBe(true);
      expect(result.entries[2].highlightColor).toBe('red');
      expect(result.entries[0].isHighlighted).toBe(false);
      expect(result.entries[1].isHighlighted).toBe(false);
    });

    it('should never show period champions for worst10', () => {
      const result = createWorst10Config(mockGameResults);

      expect(result.showPeriodChampions).toBe(false);
      expect(result.periodChampions).toEqual([]);
    });

    it('should include period identifier', () => {
      const result = createWorst10Config(mockGameResults);

      expect(result.period).toBe('first-half');
    });

    it('should handle empty worst10 array', () => {
      const emptyResults: GameResults = {
        ...mockGameResults,
        worst10: [],
      };

      const result = createWorst10Config(emptyResults);

      expect(result.entries).toHaveLength(0);
    });
  });

  describe('createTop10Config', () => {
    const mockGameResults: GameResults = {
      top10: [
        {
          guestId: 'guest-1',
          guestName: '太郎(チームA)',
          responseTimeMs: 500,
        },
        {
          guestId: 'guest-2',
          guestName: '花子(チームB)',
          responseTimeMs: 600,
        },
        {
          guestId: 'guest-3',
          guestName: '次郎(チームC)',
          responseTimeMs: 700,
        },
      ],
      worst10: [],
      period: 'second-half',
      periodChampions: ['guest-1', 'guest-2'],
    };

    it('should create top10 config with correct title', () => {
      const result = createTop10Config(mockGameResults);

      expect(result.title).toBe('早押しトップ10');
      expect(result.type).toBe('top10');
    });

    it('should transform all top10 entries', () => {
      const result = createTop10Config(mockGameResults);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[2].rank).toBe(3);
    });

    it('should highlight first entry with gold color', () => {
      const result = createTop10Config(mockGameResults);

      expect(result.entries[0].isHighlighted).toBe(true);
      expect(result.entries[0].highlightColor).toBe('gold');
      expect(result.entries[1].isHighlighted).toBe(false);
      expect(result.entries[2].isHighlighted).toBe(false);
    });

    it('should show period champions when they exist', () => {
      const result = createTop10Config(mockGameResults);

      expect(result.showPeriodChampions).toBe(true);
      expect(result.periodChampions).toEqual(['guest-1', 'guest-2']);
    });

    it('should mark period champions correctly', () => {
      const result = createTop10Config(mockGameResults);

      expect(result.entries[0].isPeriodChampion).toBe(true);
      expect(result.entries[1].isPeriodChampion).toBe(true);
      expect(result.entries[2].isPeriodChampion).toBe(false);
    });

    it('should not show period champions when array is empty', () => {
      const noChampions: GameResults = {
        ...mockGameResults,
        periodChampions: [],
      };

      const result = createTop10Config(noChampions);

      expect(result.showPeriodChampions).toBe(false);
    });

    it('should not show period champions when undefined', () => {
      const noChampions: GameResults = {
        ...mockGameResults,
        periodChampions: undefined,
      };

      const result = createTop10Config(noChampions);

      expect(result.showPeriodChampions).toBe(false);
      expect(result.periodChampions).toEqual([]);
    });
  });
});
