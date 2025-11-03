import { verifyAuthToken } from '../../../src/auth/tokenVerifier';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  auth: jest.fn(),
  firestore: jest.fn(),
  initializeApp: jest.fn(),
}));

describe('Token Verification', () => {
  let mockVerifyIdToken: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken = jest.fn();
    (admin.auth as jest.Mock).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    });
  });

  describe('Valid token scenarios (T022)', () => {
    it('should return userId for valid token', async () => {
      const mockToken = 'valid-token-abc123';
      const mockUserId = 'user-123';

      mockVerifyIdToken.mockResolvedValue({ uid: mockUserId });

      const result = await verifyAuthToken(mockToken);

      expect(result).toEqual({
        userId: mockUserId,
        isValid: true,
      });
      expect(mockVerifyIdToken).toHaveBeenCalledWith(mockToken, true);
    });

    it('should return userId for different valid token', async () => {
      const mockToken = 'another-valid-token';
      const mockUserId = 'user-456';

      mockVerifyIdToken.mockResolvedValue({ uid: mockUserId });

      const result = await verifyAuthToken(mockToken);

      expect(result.userId).toBe(mockUserId);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Invalid token scenarios (T023)', () => {
    it('should return isValid=false for invalid token', async () => {
      const mockToken = 'invalid-token-xyz789';

      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const result = await verifyAuthToken(mockToken);

      expect(result).toEqual({
        userId: null,
        isValid: false,
        error: 'Invalid token',
      });
    });

    it('should return isValid=false for malformed token', async () => {
      const mockToken = 'malformed';

      mockVerifyIdToken.mockRejectedValue(new Error('Token signature invalid'));

      const result = await verifyAuthToken(mockToken);

      expect(result.isValid).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.error).toBe('Token signature invalid');
    });

    it('should handle empty token string', async () => {
      const result = await verifyAuthToken('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });
  });

  describe('Expired token scenarios (T024)', () => {
    it('should return isValid=false for expired token', async () => {
      const mockToken = 'expired-token-abc123';

      mockVerifyIdToken.mockRejectedValue(new Error('Token expired'));

      const result = await verifyAuthToken(mockToken);

      expect(result).toEqual({
        userId: null,
        isValid: false,
        error: 'Token expired',
      });
    });

    it('should return isValid=false for revoked token', async () => {
      const mockToken = 'revoked-token';

      mockVerifyIdToken.mockRejectedValue(new Error('Token has been revoked'));

      const result = await verifyAuthToken(mockToken);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token has been revoked');
    });
  });

  describe('Edge cases', () => {
    it('should handle non-string token input', async () => {
      const result = await verifyAuthToken(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should handle Firebase SDK errors gracefully', async () => {
      mockVerifyIdToken.mockRejectedValue({ code: 'auth/network-error' });

      const result = await verifyAuthToken('some-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
