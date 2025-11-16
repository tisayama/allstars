/**
 * Unit tests for environment variable security
 * Feature: 001-projector-auth [US2]
 *
 * Validates that sensitive credentials are not exposed in client-side environment variables
 */

import { describe, it, expect } from 'vitest';
import { validateEnvironmentSecurity } from '../../src/utils/envValidator';

describe('Environment Variable Security [US2]', () => {
  describe('validateEnvironmentSecurity', () => {
    it('should pass when no sensitive credentials are present', () => {
      const safeEnv = {
        VITE_API_BASE_URL: 'http://localhost:5001/api',
        VITE_PROJECTOR_API_KEY: 'safe-api-key-123',
        VITE_SOCKET_SERVER_URL: 'http://localhost:3001',
      };

      const result = validateEnvironmentSecurity(safeEnv);

      expect(result.isSecure).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect FIREBASE_PRIVATE_KEY in environment variables', () => {
      const unsafeEnv = {
        VITE_API_BASE_URL: 'http://localhost:5001/api',
        VITE_FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nMIIE...',
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('FIREBASE_PRIVATE_KEY');
      expect(result.violations[0]).toContain('VITE_FIREBASE_PRIVATE_KEY');
    });

    it('should detect service account credentials pattern', () => {
      const unsafeEnv = {
        VITE_SERVICE_ACCOUNT: JSON.stringify({
          type: 'service_account',
          project_id: 'test-project',
          private_key: '-----BEGIN PRIVATE KEY-----\n...',
          client_email: 'firebase-adminsdk@test.iam.gserviceaccount.com',
        }),
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.includes('service_account'))).toBe(true);
    });

    it('should detect private key patterns', () => {
      const unsafeEnv = {
        VITE_CONFIG: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...',
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations.some(v => v.toLowerCase().includes('private key'))).toBe(true);
    });

    it('should detect client_email pattern', () => {
      const unsafeEnv = {
        VITE_EMAIL: 'firebase-adminsdk-abc123@project.iam.gserviceaccount.com',
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations.some(v => v.includes('client_email'))).toBe(true);
    });

    it('should allow regular email addresses', () => {
      const safeEnv = {
        VITE_SUPPORT_EMAIL: 'support@example.com',
        VITE_CONTACT: 'user@domain.org',
      };

      const result = validateEnvironmentSecurity(safeEnv);

      expect(result.isSecure).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should check all VITE_ prefixed variables', () => {
      const mixedEnv = {
        VITE_SAFE_VAR: 'safe-value',
        VITE_UNSAFE_VAR: '-----BEGIN PRIVATE KEY-----',
        NODE_ENV: 'test',
        PRIVATE_KEY: 'this-should-not-be-checked', // Not VITE_ prefixed
      };

      const result = validateEnvironmentSecurity(mixedEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toContain('VITE_UNSAFE_VAR');
    });

    it('should provide detailed violation messages', () => {
      const unsafeEnv = {
        VITE_CREDS: JSON.stringify({
          type: 'service_account',
          private_key: '-----BEGIN PRIVATE KEY-----\n...',
        }),
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);

      // Each violation should include the variable name
      result.violations.forEach(violation => {
        expect(violation).toContain('VITE_');
      });
    });

    it('should detect multiple violations in single environment', () => {
      const unsafeEnv = {
        VITE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\n...',
        VITE_SERVICE_ACCOUNT_EMAIL: 'firebase-adminsdk@project.iam.gserviceaccount.com',
        VITE_CREDENTIALS: '{"type": "service_account"}',
      };

      const result = validateEnvironmentSecurity(unsafeEnv);

      expect(result.isSecure).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Integration with import.meta.env', () => {
    it('should validate actual environment variables', () => {
      // This test validates the current environment
      const result = validateEnvironmentSecurity(import.meta.env);

      if (!result.isSecure) {
        console.error('SECURITY VIOLATION: Sensitive credentials found in environment:');
        result.violations.forEach(violation => {
          console.error(`  - ${violation}`);
        });
      }

      expect(result.isSecure).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle null/undefined environment gracefully', () => {
      const result = validateEnvironmentSecurity(null as any);

      expect(result.isSecure).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle empty environment', () => {
      const result = validateEnvironmentSecurity({});

      expect(result.isSecure).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle environment with non-string values', () => {
      const envWithNumbers = {
        VITE_PORT: 3000,
        VITE_ENABLED: true,
      } as any;

      const result = validateEnvironmentSecurity(envWithNumbers);

      expect(result.isSecure).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
