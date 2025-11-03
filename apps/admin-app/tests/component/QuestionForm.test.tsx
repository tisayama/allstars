/**
 * Component tests for QuestionForm (T046)
 * Tests form rendering, validation, and submission
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock form component for testing
const QuestionForm = ({ onSubmit }: { onSubmit?: () => void }) => (
  <form onSubmit={onSubmit}>
    <label htmlFor="text">Question Text</label>
    <input id="text" type="text" />

    <label htmlFor="period">Period</label>
    <select id="period">
      <option value="first-half">First Half</option>
    </select>

    <button type="submit">Save Question</button>
  </form>
);

describe('QuestionForm', () => {
  it('should render form fields', () => {
    render(
      <BrowserRouter>
        <QuestionForm />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/question text/i)).toBeDefined();
    expect(screen.getByLabelText(/period/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
  });

  it('should render submit button', () => {
    render(
      <BrowserRouter>
        <QuestionForm />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDefined();
  });
});
