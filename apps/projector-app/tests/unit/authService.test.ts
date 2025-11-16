/**
 * Unit tests for authService
 * Feature: 001-projector-auth [US1]
 *
 * Tests custom token fetching from API server
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchCustomToken } from '../../src/services/authService';

// Mock fetch
global.fetch = vi.fn();

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set environment variables for tests
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:5001/test-project/us-central1/api';
    import.meta.env.VITE_PROJECTOR_API_KEY = 'test-api-key-123';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCustomToken', () => {
    it('should fetch custom token successfully', async () => {
      const mockResponse = {
        token: 'mock-custom-token-abc123',
        expiresAt: Date.now() + 3600000,
        uid: 'projector-test-uuid',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchCustomToken();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5001/test-project/us-central1/api/projector/auth-token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'test-api-key-123',
          },
        }
      );
    });

    it('should throw error when API key is missing', async () => {
      import.meta.env.VITE_PROJECTOR_API_KEY = '';

      await expect(fetchCustomToken()).rejects.toThrow('VITE_PROJECTOR_API_KEY is not configured');
    });

    it('should throw error when API base URL is missing', async () => {
      import.meta.env.VITE_API_BASE_URL = '';

      await expect(fetchCustomToken()).rejects.toThrow('VITE_API_BASE_URL is not configured');
    });

    it('should throw error on 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'UNAUTHORIZED',
          message: 'Invalid API key',
          statusCode: 401,
        }),
      });

      await expect(fetchCustomToken()).rejects.toThrow('Failed to fetch custom token: 401');
    });

    it('should throw error on 500 Internal Server Error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'INTERNAL_ERROR',
          message: 'Token generation failed',
          statusCode: 500,
        }),
      });

      await expect(fetchCustomToken()).rejects.toThrow('Failed to fetch custom token: 500');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(fetchCustomToken()).rejects.toThrow('Network error');
    });

    it('should include correct headers in request', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'test', expiresAt: Date.now(), uid: 'test' }),
      });

      await fetchCustomToken();

      const [, options] = (global.fetch as any).mock.calls[0];
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key-123',
      });
    });

    it('should use correct endpoint URL', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'test', expiresAt: Date.now(), uid: 'test' }),
      });

      await fetchCustomToken();

      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toBe('http://localhost:5001/test-project/us-central1/api/projector/auth-token');
    });
  });
});
