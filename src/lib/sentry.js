/**
 * Sentry error monitoring wrapper.
 *
 * Required Vercel env vars:
 *   VITE_SENTRY_DSN  — from sentry.io → Project → Settings → Client Keys (DSN)
 *
 * All exports are safe no-ops when VITE_SENTRY_DSN is not set,
 * so the app works in local dev without any Sentry config.
 */

import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance: capture 20% of transactions
    tracesSampleRate: 0.2,
    // Session Replay: 10% of sessions, 100% when an error occurs
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    // Don't send errors in local dev even if DSN is somehow present
    enabled: import.meta.env.PROD,
  });
}

/**
 * Manually capture an exception with optional context.
 * Safe no-op when Sentry is not initialised.
 * @param {unknown} error
 * @param {{ [key: string]: unknown }} [context]
 */
export function captureException(error, context = {}) {
  if (!dsn) return;
  Sentry.withScope((scope) => {
    if (Object.keys(context).length > 0) {
      scope.setContext('extra', context);
    }
    Sentry.captureException(error);
  });
}

// Re-export the full Sentry namespace so callers can use
// Sentry.ErrorBoundary, Sentry.withProfiler, etc. directly
export { Sentry };
