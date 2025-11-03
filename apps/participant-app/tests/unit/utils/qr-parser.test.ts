import { describe, it, expect, beforeEach } from 'vitest';

describe('QR Code Parser', () => {
  beforeEach(() => {
    import.meta.env.VITE_PARTICIPANT_APP_URL = 'http://localhost:5173';
  });

  describe('parseQRCodeUrl', () => {
    it('should extract token from valid QR code URL', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join?token=qr_token_abc123xyz789';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('qr_token_abc123xyz789');
    });

    it('should extract token from production URL', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'https://allstars.app/join?token=prod_token_xyz';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('prod_token_xyz');
    });

    it('should handle URL with trailing slash', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join/?token=token_with_slash';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('token_with_slash');
    });

    it('should return null for invalid path', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/invalid?token=some_token';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBeNull();
    });

    it('should return null when token is missing', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBeNull();
    });

    it('should return null for token that is too short', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join?token=short';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBeNull();
    });

    it('should return null for malformed URL', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'not-a-valid-url';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBeNull();
    });

    it('should handle tokens with hyphens and underscores', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join?token=token-with_special-chars_123';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('token-with_special-chars_123');
    });
  });

  describe('isValidToken', () => {
    it('should return true for valid token', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('qr_token_abc123xyz789')).toBe(true);
    });

    it('should return true for token with hyphens', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('token-with-hyphens-123')).toBe(true);
    });

    it('should return false for token that is too short', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('short')).toBe(false);
    });

    it('should return false for token with special characters', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('token@with#special!')).toBe(false);
    });

    it('should return false for token with spaces', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('token with spaces')).toBe(false);
    });

    it('should return false for empty token', async () => {
      const { isValidToken } = await import('@/utils/qr-parser');

      expect(isValidToken('')).toBe(false);
    });
  });

  describe('generateQRCodeUrl', () => {
    it('should generate URL with token using default base URL', async () => {
      const { generateQRCodeUrl } = await import('@/utils/qr-parser');

      const url = generateQRCodeUrl('test_token_123');

      expect(url).toBe('http://localhost:5173/join?token=test_token_123');
    });

    it('should generate URL with custom base URL', async () => {
      const { generateQRCodeUrl } = await import('@/utils/qr-parser');

      const url = generateQRCodeUrl('test_token_123', 'https://allstars.app');

      expect(url).toBe('https://allstars.app/join?token=test_token_123');
    });

    it('should handle base URL with trailing slash', async () => {
      const { generateQRCodeUrl } = await import('@/utils/qr-parser');

      const url = generateQRCodeUrl('test_token_123', 'https://allstars.app/');

      expect(url).toBe('https://allstars.app//join?token=test_token_123');
    });
  });

  describe('Edge Cases', () => {
    it('should handle URL with multiple query parameters', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join?foo=bar&token=valid_token_123&baz=qux';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('valid_token_123');
    });

    it('should handle URL with fragment', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:5173/join?token=valid_token_123#section';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('valid_token_123');
    });

    it('should handle URL with port number', async () => {
      const { parseQRCodeUrl } = await import('@/utils/qr-parser');

      const qrUrl = 'http://localhost:8080/join?token=valid_token_123';
      const token = parseQRCodeUrl(qrUrl);

      expect(token).toBe('valid_token_123');
    });
  });
});
