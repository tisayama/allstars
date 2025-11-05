import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadyForNextPhase } from '@/components/phases/ReadyForNextPhase';
import type { GameState } from '@/types';

describe('ReadyForNextPhase', () => {
  const baseGameState: GameState = {
    id: 'live',
    currentPhase: 'ready_for_next',
    currentQuestion: null,
    isGongActive: false,
    results: null,
    prizeCarryover: 0,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render the ready screen with basic elements', () => {
    render(<ReadyForNextPhase gameState={baseGameState} />);

    expect(screen.getByText('AllStars Quiz')).toBeInTheDocument();
    expect(screen.getByText('Get ready for the next question...')).toBeInTheDocument();
  });

  it('should not show prize carryover when value is 0', () => {
    render(<ReadyForNextPhase gameState={baseGameState} />);

    expect(screen.queryByText(/Prize Carryover/i)).not.toBeInTheDocument();
  });

  it('should show prize carryover when value is greater than 0', () => {
    const gameStateWithPrize: GameState = {
      ...baseGameState,
      prizeCarryover: 50000,
    };

    render(<ReadyForNextPhase gameState={gameStateWithPrize} />);

    expect(screen.getByText(/Prize Carryover/i)).toBeInTheDocument();
    expect(screen.getByText(/¥50,000/i)).toBeInTheDocument();
  });

  it('should handle undefined prizeCarryover gracefully', () => {
    const gameStateWithoutPrize: GameState = {
      ...baseGameState,
      prizeCarryover: undefined,
    };

    render(<ReadyForNextPhase gameState={gameStateWithoutPrize} />);

    expect(screen.queryByText(/Prize Carryover/i)).not.toBeInTheDocument();
  });

  it('should format large prize amounts with proper locale formatting', () => {
    const gameStateWithLargePrize: GameState = {
      ...baseGameState,
      prizeCarryover: 1000000,
    };

    render(<ReadyForNextPhase gameState={gameStateWithLargePrize} />);

    expect(screen.getByText(/¥1,000,000/i)).toBeInTheDocument();
  });
});
