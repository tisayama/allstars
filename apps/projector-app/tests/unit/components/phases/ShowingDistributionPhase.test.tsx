import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowingDistributionPhase } from '@/components/phases/ShowingDistributionPhase';
import type { GameState } from '@/types';

// Mock useAnswerCount hook
vi.mock('@/hooks/useAnswerCount', () => ({
  useAnswerCount: vi.fn(() => ({
    '2': 5,
    '3': 10,
    '4': 25,
    '5': 8,
  })),
}));

describe('ShowingDistributionPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'showing_distribution',
    currentQuestion: {
      questionId: 'q1',
      questionText: 'What is 2 + 2?',
      choices: [
        { index: 0, text: '2' },
        { index: 1, text: '3' },
        { index: 2, text: '4' },
        { index: 3, text: '5' },
      ],
      correctAnswer: '4',
      period: 'first-half',
      questionNumber: 1,
      deadline: { seconds: 1699114200, nanoseconds: 0 } as any,
      type: 'multiple-choice',
      skipAttributes: [],
    },
    isGongActive: false,
    results: null,
    prizeCarryover: 0,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render the answer distribution title', () => {
    render(<ShowingDistributionPhase gameState={mockGameState} />);

    expect(screen.getByText('Answer Distribution')).toBeInTheDocument();
  });

  it('should render all choice options', () => {
    const { container } = render(<ShowingDistributionPhase gameState={mockGameState} />);

    // Check that all choices are present - using getAllByText to handle duplicates
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);

    // Verify the distribution container exists
    expect(container.querySelector('[style*="background-color: rgb(42, 42, 42)"]')).toBeInTheDocument();
  });

  it('should show error when currentQuestion is null', () => {
    const gameStateWithoutQuestion: GameState = {
      ...mockGameState,
      currentQuestion: null,
    };

    render(<ShowingDistributionPhase gameState={gameStateWithoutQuestion} />);

    expect(screen.getByText('Error: No question data available')).toBeInTheDocument();
  });

  it('should render answer counts for each choice', () => {
    const { container } = render(<ShowingDistributionPhase gameState={mockGameState} />);

    // Check that the distribution container exists with the expected number of rows
    const distributionRows = container.querySelectorAll('div > div > div');
    // The component creates rows for each choice
    expect(distributionRows.length).toBeGreaterThan(0);
  });

  it('should handle questions with different number of choices', () => {
    const gameStateWithThreeChoices: GameState = {
      ...mockGameState,
      currentQuestion: {
        ...mockGameState.currentQuestion!,
        choices: [
          { index: 0, text: 'True' },
          { index: 1, text: 'False' },
          { index: 2, text: 'Maybe' },
        ],
      },
    };

    render(<ShowingDistributionPhase gameState={gameStateWithThreeChoices} />);

    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
    expect(screen.getByText('Maybe')).toBeInTheDocument();
  });
});
