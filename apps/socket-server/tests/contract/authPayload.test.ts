import { isAuthenticatePayload } from '@allstars/types';

describe('Authenticate Event Payload Contract', () => {
  describe('isAuthenticatePayload type guard', () => {
    it('should accept valid authenticate payload with token', () => {
      const payload = {
        token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ...',
      };
      expect(isAuthenticatePayload(payload)).toBe(true);
    });

    it('should reject payload with missing token', () => {
      const payload = {};
      expect(isAuthenticatePayload(payload)).toBe(false);
    });

    it('should reject payload with empty token', () => {
      const payload = { token: '' };
      expect(isAuthenticatePayload(payload)).toBe(false);
    });

    it('should reject payload with non-string token', () => {
      const payload = { token: 12345 };
      expect(isAuthenticatePayload(payload)).toBe(false);
    });

    it('should reject null payload', () => {
      expect(isAuthenticatePayload(null)).toBe(false);
    });

    it('should reject undefined payload', () => {
      expect(isAuthenticatePayload(undefined)).toBe(false);
    });

    it('should reject non-object payload', () => {
      expect(isAuthenticatePayload('not-an-object')).toBe(false);
    });
  });
});
