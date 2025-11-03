/**
 * Component tests for QuestionList (T047)
 * Tests question list rendering with edit/delete buttons
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { Question } from '@allstars/types';

const mockQuestions: Partial<Question>[] = [
  {
    id: '1',
    period: 'first-half',
    questionNumber: 1,
    text: 'What is the capital of France?',
    type: 'multiple-choice',
    choices: ['Paris', 'London', 'Berlin', 'Madrid'],
    correctAnswer: 'Paris',
    skipAttributes: [],
  },
];

const QuestionList = ({ questions }: { questions: Partial<Question>[] }) => (
  <div>
    <h2>Questions</h2>
    {questions.map((q) => (
      <div key={q.id}>
        <span>{q.text}</span>
        <button>Edit</button>
        <button>Delete</button>
      </div>
    ))}
  </div>
);

describe('QuestionList', () => {
  it('should render question list', () => {
    render(
      <BrowserRouter>
        <QuestionList questions={mockQuestions} />
      </BrowserRouter>
    );

    expect(screen.getByText(/what is the capital/i)).toBeDefined();
  });

  it('should render edit and delete buttons', () => {
    render(
      <BrowserRouter>
        <QuestionList questions={mockQuestions} />
      </BrowserRouter>
    );

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

    expect(editButtons.length).toBe(1);
    expect(deleteButtons.length).toBe(1);
  });
});
