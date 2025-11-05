import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllRevivedPhase } from '@/components/phases/AllRevivedPhase';
import type { GameState } from '@/types';

describe('AllRevivedPhase', () => {
  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'all_revived',
    currentQuestion: null,
    isGongActive: false,
    results: null,
    prizeCarryover: 0,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render the revival celebration title', () => {
    render(<AllRevivedPhase gameState={mockGameState} />);

    expect(screen.getByText("Everyone's Back!")).toBeInTheDocument();
  });

  it('should render the revival message', () => {
    render(<AllRevivedPhase gameState={mockGameState} />);

    expect(
      screen.getByText('All eliminated guests have been revived and are back in the game!')
    ).toBeInTheDocument();
  });

  it('should render the celebration emoji', () => {
    const { container } = render(<AllRevivedPhase gameState={mockGameState} />);

    expect(container.textContent).toContain('🎉');
  });

  it('should render even when gameState has other data', () => {
    const gameStateWithExtras: GameState = {
      ...mockGameState,
      prizeCarryover: 50000,
      currentQuestion: {
        questionId: 'q1',
        questionText: 'Test question',
        choices: [
          { index: 0, text: 'A' },
          { index: 1, text: 'B' },
        ],
        correctAnswer: 'A',
        period: 'first-half',
        questionNumber: 1,
        deadline: { seconds: 1699114200, nanoseconds: 0 } as any,
        type: 'multiple-choice',
        skipAttributes: [],
      },
    };

    render(<AllRevivedPhase gameState={gameStateWithExtras} />);

    expect(screen.getByText("Everyone's Back!")).toBeInTheDocument();
  });
});
