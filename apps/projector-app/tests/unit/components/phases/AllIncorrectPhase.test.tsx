import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AllIncorrectPhase } from '@/components/phases/AllIncorrectPhase';
import type { GameState } from '@/types';

describe('AllIncorrectPhase', () => {
  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'all_incorrect',
    currentQuestion: null,
    isGongActive: false,
    results: null,
    prizeCarryover: 50000,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render the all incorrect title', () => {
    render(<AllIncorrectPhase gameState={mockGameState} />);

    expect(screen.getByText('Everyone Got It Wrong!')).toBeInTheDocument();
  });

  it('should render the carryover message', () => {
    render(<AllIncorrectPhase gameState={mockGameState} />);

    expect(
      screen.getByText('No one answered correctly. The prize carries over to the next question!')
    ).toBeInTheDocument();
  });

  it('should render the sad emoji', () => {
    const { container } = render(<AllIncorrectPhase gameState={mockGameState} />);

    expect(container.textContent).toContain('😱');
  });

  it('should display the prize carryover amount', () => {
    render(<AllIncorrectPhase gameState={mockGameState} />);

    expect(screen.getByText('Prize Carryover')).toBeInTheDocument();
    expect(screen.getByText('¥50,000')).toBeInTheDocument();
  });

  it('should format large prize amounts correctly', () => {
    const gameStateWithLargePrize: GameState = {
      ...mockGameState,
      prizeCarryover: 1000000,
    };

    render(<AllIncorrectPhase gameState={gameStateWithLargePrize} />);

    expect(screen.getByText('¥1,000,000')).toBeInTheDocument();
  });

  it('should display zero when prizeCarryover is 0', () => {
    const gameStateWithZeroPrize: GameState = {
      ...mockGameState,
      prizeCarryover: 0,
    };

    render(<AllIncorrectPhase gameState={gameStateWithZeroPrize} />);

    expect(screen.getByText('¥0')).toBeInTheDocument();
  });

  it('should handle undefined prizeCarryover gracefully', () => {
    const gameStateWithoutPrize: GameState = {
      ...mockGameState,
      prizeCarryover: undefined,
    };

    render(<AllIncorrectPhase gameState={gameStateWithoutPrize} />);

    expect(screen.getByText('¥0')).toBeInTheDocument();
  });

  it('should display prize carryover with proper styling', () => {
    const { container } = render(<AllIncorrectPhase gameState={mockGameState} />);

    // Find the prize carryover container with gold border
    const prizeContainer = container.querySelector('[style*="border"]');
    expect(prizeContainer).toBeTruthy();
  });
});
