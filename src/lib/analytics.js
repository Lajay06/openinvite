/**
 * PostHog analytics wrapper.
 *
 * Required Vercel env vars:
 *   VITE_POSTHOG_KEY   — Project API key from posthog.com → Project Settings → API Keys
 *   VITE_POSTHOG_HOST  — (optional) defaults to https://us.i.posthog.com
 *
 * All functions are safe no-ops when VITE_POSTHOG_KEY is not set,
 * so the app works in local dev without any env configuration.
 */

import posthog from 'posthog-js';
import { isGuestRoute } from './isGuestRoute';

const key  = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

// GUEST ROUTES GET NO ANALYTICS AT ALL.
//
// Not "no events" -- no init. Before this, a guest visiting a couple's
// wedding site loaded PostHog's config plus surveys.js,
// dead-clicks-autocapture.js and web-vitals.js, which meant their IP reached
// PostHog and the machinery for behavioural capture was present and idle. No
// events were being sent, but presence itself is the exposure: capture was a
// configuration change away, and "we hold less about your guests by design"
// has to be true of telemetry too.
const analyticsEnabled = !!key && !isGuestRoute();

if (analyticsEnabled) {
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only', // only create profiles for identified users
    capture_pageview: true,             // auto-capture page views on route change
    autocapture: false,                 // disable noisy click/input autocapture
  });
}

/**
 * Associate future events with a known user identity.
 * Call after login or sign-up once you have the user's ID.
 * @param {string} userId
 * @param {Record<string, unknown>} [properties]
 */
export function identify(userId, properties = {}) {
  if (!analyticsEnabled) return;
  posthog.identify(userId, properties);
}

/**
 * Track a named event with optional properties.
 * @param {string} event
 * @param {Record<string, unknown>} [properties]
 */
export function track(event, properties = {}) {
  if (!analyticsEnabled) return;
  posthog.capture(event, properties);
}

/**
 * Reset the PostHog identity — call on logout.
 */
export function reset() {
  if (!analyticsEnabled) return;
  posthog.reset();
}
