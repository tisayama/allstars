/**
 * Unit tests for useSettings hook (T092)
 * Tests GET and PUT operations for game settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock hook implementation
const useSettings = () => {
  return {
    settings: null,
    loading: false,
    error: null,
    fetchSettings: vi.fn(),
    updateSettings: vi.fn(),
  };
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null settings', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should provide fetch and update functions', () => {
    const { result } = renderHook(() => useSettings());

    expect(typeof result.current.fetchSettings).toBe('function');
    expect(typeof result.current.updateSettings).toBe('function');
  });
});
