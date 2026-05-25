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

const key  = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

if (key) {
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
  if (!key) return;
  posthog.identify(userId, properties);
}

/**
 * Track a named event with optional properties.
 * @param {string} event
 * @param {Record<string, unknown>} [properties]
 */
export function track(event, properties = {}) {
  if (!key) return;
  posthog.capture(event, properties);
}

/**
 * Reset the PostHog identity — call on logout.
 */
export function reset() {
  if (!key) return;
  posthog.reset();
}
