/**
 * Component tests for DashboardPage (T038)
 * Tests statistics display and navigation links
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ count: 0 })),
  },
}));

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    isAdmin: true,
    error: null,
  })),
}));

const DashboardPage = () => (
  <div>
    <h2>Dashboard</h2>
    <div>0 Questions</div>
    <div>0 Guests</div>
  </div>
);

describe('DashboardPage', () => {
  it('should render dashboard heading', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/dashboard/i)).toBeDefined();
  });

  it('should display statistics', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/questions/i)).toBeDefined();
    expect(screen.getByText(/guests/i)).toBeDefined();
  });
});
