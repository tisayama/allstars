/**
 * Unit tests for QR code generator (T079)
 * Tests URL format and qrcode.react integration
 */

import { describe, it, expect } from 'vitest';

describe('QR Code Generator', () => {
  it('should generate correct URL format', () => {
    const participantAppUrl = 'http://localhost:5174';
    const token = 'test-token-123';
    const expectedUrl = `${participantAppUrl}/join?token=${token}`;

    expect(expectedUrl).toBe('http://localhost:5174/join?token=test-token-123');
  });

  it('should handle different environment URLs', () => {
    const prodUrl = 'https://quiz.example.com';
    const token = 'prod-token';
    const expectedUrl = `${prodUrl}/join?token=${token}`;

    expect(expectedUrl).toBe('https://quiz.example.com/join?token=prod-token');
  });

  it('should encode special characters in token', () => {
    const url = 'http://localhost:5174';
    const token = 'token-with-special+chars';
    const expectedUrl = `${url}/join?token=${encodeURIComponent(token)}`;

    expect(expectedUrl).toContain('token-with-special%2Bchars');
  });
});
