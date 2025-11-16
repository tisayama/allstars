/**
 * Environment Variable Security Validator
 * Feature: 001-projector-auth [US2]
 *
 * Validates that no Firebase service account credentials or private keys
 * are exposed in client-side environment variables (VITE_* prefix)
 */

export interface SecurityValidationResult {
  isSecure: boolean;
  violations: string[];
}

/**
 * Patterns that indicate sensitive credentials
 */
const SENSITIVE_PATTERNS = [
  {
    regex: /-----BEGIN PRIVATE KEY-----/i,
    description: 'Private key detected',
  },
  {
    regex: /"type"\s*:\s*"service_account"|type.*service_account/i,
    description: 'service_account credentials detected',
  },
  {
    regex: /firebase-adminsdk.*@.*\.iam\.gserviceaccount\.com/i,
    description: 'Service account client_email detected',
  },
  {
    regex: /FIREBASE_PRIVATE_KEY/i,
    description: 'FIREBASE_PRIVATE_KEY reference detected',
  },
  {
    regex: /"private_key"\s*:|private_key.*-----BEGIN/i,
    description: 'private_key field detected',
  },
];

/**
 * Validates environment variables for security violations
 *
 * Checks all VITE_* prefixed environment variables for:
 * - Firebase private keys
 * - Service account credentials
 * - Client email addresses (firebase-adminsdk pattern)
 *
 * @param env - Environment object (e.g., import.meta.env)
 * @returns Security validation result with violations list
 */
export function validateEnvironmentSecurity(
  env: Record<string, unknown>
): SecurityValidationResult {
  const violations: string[] = [];

  // Handle null/undefined/empty environment
  if (!env || typeof env !== 'object') {
    return {
      isSecure: true,
      violations: [],
    };
  }

  // Check all VITE_ prefixed variables
  const viteVars = Object.keys(env).filter((key) => key.startsWith('VITE_'));

  for (const varName of viteVars) {
    const value = env[varName];

    // Skip non-string values
    if (typeof value !== 'string') {
      continue;
    }

    // Check against sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.regex.test(value)) {
        violations.push(`SECURITY VIOLATION in ${varName}: ${pattern.description}`);
      }
    }
  }

  return {
    isSecure: violations.length === 0,
    violations,
  };
}

/**
 * Validates current environment and throws error if insecure
 *
 * Should be called during app initialization to fail fast
 * if credentials are accidentally exposed
 */
export function assertEnvironmentSecurity(): void {
  const result = validateEnvironmentSecurity(import.meta.env);

  if (!result.isSecure) {
    const errorMessage = [
      '🔒 SECURITY ERROR: Sensitive credentials detected in environment variables!',
      '',
      'The following violations were found:',
      ...result.violations.map((v) => `  ❌ ${v}`),
      '',
      'SOLUTION:',
      '  - Remove all FIREBASE_PRIVATE_KEY references from .env files',
      '  - Remove all service account credentials from VITE_* variables',
      '  - Use server-side environment variables for sensitive data',
      '  - Only expose the VITE_PROJECTOR_API_KEY (static API key)',
      '',
      'See: specs/001-projector-auth/README.md for proper configuration',
    ].join('\n');

    throw new Error(errorMessage);
  }
}
