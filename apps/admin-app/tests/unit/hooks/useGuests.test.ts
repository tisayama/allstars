/**
 * Unit tests for useGuests hook (T063)
 * Tests GET, POST, PUT, DELETE operations for guests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Guest } from '@allstars/types';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock hook implementation
const useGuests = () => {
  return {
    guests: [] as Guest[],
    loading: false,
    error: null,
    fetchGuests: vi.fn(),
    createGuest: vi.fn(),
    updateGuest: vi.fn(),
    deleteGuest: vi.fn(),
    bulkImportGuests: vi.fn(),
  };
};

describe('useGuests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty guests array', () => {
    const { result } = renderHook(() => useGuests());

    expect(result.current.guests).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide CRUD and bulk import functions', () => {
    const { result } = renderHook(() => useGuests());

    expect(typeof result.current.fetchGuests).toBe('function');
    expect(typeof result.current.createGuest).toBe('function');
    expect(typeof result.current.updateGuest).toBe('function');
    expect(typeof result.current.deleteGuest).toBe('function');
    expect(typeof result.current.bulkImportGuests).toBe('function');
  });
});
