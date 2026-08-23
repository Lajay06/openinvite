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
import { isGuestRoute } from './isGuestRoute';

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Explicit rather than relying on SDK defaults (which mask/block by
      // default today, but that's an upgrade-fragile assumption) — the
      // privacy policy's "masked session replay" claim should be enforced
      // by our own config, not by whatever the installed version defaults to.
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        // Pinned rather than inherited, for the same reason the two above
        // are: the SDK masks inputs by default TODAY, and this file already
        // says relying on that is upgrade-fragile. An unmasked input in a
        // replay is a guest's RSVP answers or a couple's guest list.
        maskAllInputs: true,
      }),
    ],
    // Performance tracing. ZERO on guest routes, same shape and same reason
    // as replay below: a plain guest visit was emitting ~100 KB transaction
    // envelopes -- telemetry about people who never signed up. With this and
    // the replay line together, the honest guest sentence becomes
    // "error reporting only, nothing else".
    //
    // Guest-page performance monitoring is a post-launch revisit, with
    // disclosure, if we ever want it back.
    tracesSampleRate: isGuestRoute() ? 0 : 0.2,
    // Session Replay: 10% of sessions, 100% when an error occurs
    // Session Replay. 10% of sessions on couple-facing pages; ZERO on guest
    // pages. Recording one in ten guests browsing a couple's wedding site --
    // people who never signed up for anything -- is not proportionate, and a
    // replay carries the DOM: the couple's names, date, venue, and a guest's
    // own RSVP form state.
    //
    // Error-triggered replay stays at 100% everywhere, guest routes included:
    // a guest hitting a broken RSVP form is exactly what we need to diagnose,
    // it is proportionate, and it is disclosable.
    replaysSessionSampleRate: isGuestRoute() ? 0 : 0.1,
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
