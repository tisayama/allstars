import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShowingCorrectAnswerPhase } from '@/components/phases/ShowingCorrectAnswerPhase';
import type { GameState } from '@/types';

describe('ShowingCorrectAnswerPhase', () => {
  const mockGameState: GameState = {
    id: 'live',
    currentPhase: 'showing_correct_answer',
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

  it('should render the correct answer title', () => {
    render(<ShowingCorrectAnswerPhase gameState={mockGameState} />);

    expect(screen.getByText('Correct Answer')).toBeInTheDocument();
  });

  it('should display the correct answer prominently', () => {
    render(<ShowingCorrectAnswerPhase gameState={mockGameState} />);

    const correctAnswerElements = screen.getAllByText('Paris');
    expect(correctAnswerElements.length).toBeGreaterThan(0);
  });

  it('should display the question text', () => {
    render(<ShowingCorrectAnswerPhase gameState={mockGameState} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });

  it('should show error when currentQuestion is null', () => {
    const gameStateWithoutQuestion: GameState = {
      ...mockGameState,
      currentQuestion: null,
    };

    render(<ShowingCorrectAnswerPhase gameState={gameStateWithoutQuestion} />);

    expect(screen.getByText('Error: No question data available')).toBeInTheDocument();
  });

  it('should handle numeric correct answers', () => {
    const gameStateWithNumericAnswer: GameState = {
      ...mockGameState,
      currentQuestion: {
        ...mockGameState.currentQuestion!,
        questionText: 'What is 10 + 5?',
        correctAnswer: '15',
      },
    };

    render(<ShowingCorrectAnswerPhase gameState={gameStateWithNumericAnswer} />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('What is 10 + 5?')).toBeInTheDocument();
  });

  it('should handle long text answers', () => {
    const gameStateWithLongAnswer: GameState = {
      ...mockGameState,
      currentQuestion: {
        ...mockGameState.currentQuestion!,
        questionText: 'What is the longest river in the world?',
        correctAnswer: 'The Nile River',
      },
    };

    render(<ShowingCorrectAnswerPhase gameState={gameStateWithLongAnswer} />);

    expect(screen.getByText('The Nile River')).toBeInTheDocument();
  });
});
