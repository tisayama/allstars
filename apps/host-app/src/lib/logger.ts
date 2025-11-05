/**
 * Error logging and monitoring with Sentry
 * Captures authentication, API failures, and critical events
 */

import * as Sentry from '@sentry/react';

// Initialize Sentry if DSN is provided
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export const logger = {
  /**
   * Log authentication events (FR-028)
   */
  auth: {
    loginSuccess: (email: string) => {
      console.log('[AUTH] Login success:', email);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Login successful',
        level: 'info',
        data: { email },
      });
    },
    loginFailure: (error: Error) => {
      console.error('[AUTH] Login failed:', error);
      Sentry.captureException(error, {
        tags: { event: 'auth_login_failure' },
      });
    },
    logoutSuccess: (email: string) => {
      console.log('[AUTH] Logout success:', email);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Logout successful',
        level: 'info',
        data: { email },
      });
    },
    logoutFailure: (error: Error) => {
      console.error('[AUTH] Logout failed:', error);
      Sentry.captureException(error, {
        tags: { event: 'auth_logout_failure' },
      });
    },
    sessionExpired: (email: string) => {
      console.warn('[AUTH] Session expired:', email);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Session expired',
        level: 'warning',
        data: { email },
      });
    },
    tokenRefreshed: (email: string) => {
      console.log('[AUTH] Token refreshed:', email);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Token refreshed',
        level: 'info',
        data: { email },
      });
    },
    tokenRefreshFailure: (error: Error) => {
      console.error('[AUTH] Token refresh failed:', error);
      Sentry.captureException(error, {
        tags: { event: 'auth_token_refresh_failure' },
      });
    },
  },

  /**
   * Log API request failures (FR-029)
   */
  api: {
    requestFailure: (endpoint: string, error: Error, details?: Record<string, unknown>) => {
      console.error('[API] Request failed:', endpoint, error);
      Sentry.captureException(error, {
        tags: {
          event: 'api_request_failure',
          endpoint,
        },
        ...(details ? { extra: details } : {}),
      });
    },
    timeout: (endpoint: string, duration: number) => {
      console.error('[API] Request timeout:', endpoint, `${duration}ms`);
      Sentry.captureMessage(`API timeout: ${endpoint}`, {
        level: 'error',
        tags: {
          event: 'api_timeout',
          endpoint,
        },
        extra: { duration },
      });
    },
  },

  /**
   * Log critical game state transitions (FR-030)
   */
  gameState: {
    phaseChange: (from: string, to: string, action: string) => {
      console.log('[GAME] Phase change:', { from, to, action });
      Sentry.addBreadcrumb({
        category: 'game',
        message: `Phase transition: ${from} → ${to}`,
        level: 'info',
        data: { from, to, action },
      });
    },
    actionTriggered: (action: string, payload?: unknown) => {
      console.log('[GAME] Action triggered:', action, payload);
      Sentry.addBreadcrumb({
        category: 'game',
        message: `Action: ${action}`,
        level: 'info',
        data: { action, payload },
      });
    },
  },

  /**
   * Log Firestore listener events (FR-031)
   */
  firestore: {
    connectionFailure: (error: Error) => {
      console.error('[FIRESTORE] Connection failed:', error);
      Sentry.captureException(error, {
        tags: { event: 'firestore_connection_failure' },
      });
    },
    reconnected: () => {
      console.log('[FIRESTORE] Reconnected successfully');
      Sentry.addBreadcrumb({
        category: 'firestore',
        message: 'Reconnected',
        level: 'info',
      });
    },
    listenerError: (error: Error) => {
      console.error('[FIRESTORE] Listener error:', error);
      Sentry.captureException(error, {
        tags: { event: 'firestore_listener_error' },
      });
    },
  },

  /**
   * Log generic errors
   */
  error: (error: Error, context?: Record<string, unknown>) => {
    console.error('[ERROR]', error);
    Sentry.captureException(error, context ? { extra: context } : undefined);
  },
};
