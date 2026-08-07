/**
 * POST /api/client-error-beacon
 *
 * DIAGNOSTIC — logs a client-side React render crash caught by the shared
 * root error boundary (src/main.jsx's Sentry.ErrorBoundary onError), so it
 * shows up in Vercel's server logs even when Sentry itself has nothing
 * configured/reachable. Vercel logs show no systematic dashboard error —
 * this crash is entirely client-side — so this beacon exists purely to get
 * the real error + component stack out where it can be grepped.
 *
 * Logs a SINGLE line via console.error, prefixed exactly "[client-error-
 * beacon]", greppable in Vercel's log viewer. No DB write, no entity, no
 * email — this only logs.
 *
 * PRIVACY: strict allowlist, typed and length-capped — never spreads the
 * raw request body into the log. No form values, guest data, storage,
 * cookies, or entity content are ever accepted here, by construction (there
 * are no fields for them in the allowlist below).
 *
 * Body: { errorName, errorMessage, errorStack, componentStack, pathname,
 *   userAgent, viewportWidth, layoutVariant } — see src/main.jsx for what
 *   sends this and why.
 * Response: 204, always (this is a fire-and-forget beacon; the caller
 *   doesn't read the response).
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

const MAX_SHORT = 500;
const MAX_LONG = 4000;

function str(value, maxLen) {
  return typeof value === 'string' ? value.slice(0, maxLen) : null;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const ip = getClientIp(req);
  // Generous — organic crash hits should be rare; this only guards against
  // someone hammering the endpoint to flood Vercel's log stream.
  const { limited } = checkRateLimit(ip, 'client-error-beacon', 30, 60_000);
  if (limited) {
    return res.status(429).end();
  }

  try {
    const b = req.body || {};
    const payload = {
      errorName: str(b.errorName, MAX_SHORT),
      errorMessage: str(b.errorMessage, MAX_LONG),
      errorStack: str(b.errorStack, MAX_LONG),
      componentStack: str(b.componentStack, MAX_LONG),
      pathname: str(b.pathname, MAX_SHORT),
      userAgent: str(b.userAgent, MAX_SHORT),
      viewportWidth: typeof b.viewportWidth === 'number' ? b.viewportWidth : null,
      layoutVariant: b.layoutVariant === 'desktop' || b.layoutVariant === 'mobile' ? b.layoutVariant : null,
    };
    console.error('[client-error-beacon]', JSON.stringify(payload));
  } catch (err) {
    console.error('[client-error-beacon] failed to log payload:', err.message);
  }

  return res.status(204).end();
}
