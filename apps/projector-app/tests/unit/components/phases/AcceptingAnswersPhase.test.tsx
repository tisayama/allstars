import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AcceptingAnswersPhase } from '@/components/phases/AcceptingAnswersPhase';
import type { GameState } from '@/types';

// Mock useAnswerCount hook
vi.mock('@/hooks/useAnswerCount', () => ({
  useAnswerCount: vi.fn(() => ({
    Paris: 3,
    London: 1,
    Berlin: 2,
    Madrid: 0,
  })),
}));

describe('AcceptingAnswersPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'accepting_answers',
    currentQuestion: {
      questionId: 'q1',
      questionText: 'What is the capital of France?',
      choices: [
        { index: 0, text: 'London' },
        { index: 1, text: 'Paris' },
        { index: 2, text: 'Berlin' },
        { index: 3, text: 'Madrid' },
      ],
      correctAnswer: 'Paris',
      period: 'first-half',
      questionNumber: 5,
      deadline: { seconds: 1699114200, nanoseconds: 0 } as any,
      type: 'multiple-choice',
      skipAttributes: [],
    },
    isGongActive: false,
    results: null,
    prizeCarryover: 0,
    lastUpdate: { seconds: 1699113600, nanoseconds: 0 } as any,
  };

  it('should render the question text', () => {
    render(<AcceptingAnswersPhase gameState={mockGameState} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('should render all four choices', () => {
    render(<AcceptingAnswersPhase gameState={mockGameState} />);

    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('should display period and question number', () => {
    render(<AcceptingAnswersPhase gameState={mockGameState} />);

    expect(screen.getByText(/FIRST-HALF Period - Question 5/i)).toBeInTheDocument();
  });

  it('should display countdown timer placeholder', () => {
    render(<AcceptingAnswersPhase gameState={mockGameState} />);

    expect(screen.getByText(/Countdown:/i)).toBeInTheDocument();
    expect(screen.getByText(/Time remaining/i)).toBeInTheDocument();
  });

  it('should show error when currentQuestion is null', () => {
    const gameStateWithoutQuestion: GameState = {
      ...mockGameState,
      currentQuestion: null,
    };

    render(<AcceptingAnswersPhase gameState={gameStateWithoutQuestion} />);

    expect(screen.getByText('Error: No question data available')).toBeInTheDocument();
  });

  it('should handle different periods correctly', () => {
    const secondHalfGameState: GameState = {
      ...mockGameState,
      currentQuestion: {
        ...mockGameState.currentQuestion!,
        period: 'second-half',
        questionNumber: 12,
      },
    };

    render(<AcceptingAnswersPhase gameState={secondHalfGameState} />);

    expect(screen.getByText(/SECOND-HALF Period - Question 12/i)).toBeInTheDocument();
  });

  it('should handle overtime period correctly', () => {
    const overtimeGameState: GameState = {
      ...mockGameState,
      currentQuestion: {
        ...mockGameState.currentQuestion!,
        period: 'overtime',
        questionNumber: 1,
      },
    };

    render(<AcceptingAnswersPhase gameState={overtimeGameState} />);

    expect(screen.getByText(/OVERTIME Period - Question 1/i)).toBeInTheDocument();
  });
});
