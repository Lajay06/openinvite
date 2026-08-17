/**
 * tests/persistence/rate-limiting.mjs
 *
 * Covers the fix/rate-limit-public-fns SECURITY_AUDIT.md items: the 6
 * fully-public backend functions (Google Places proxies + Spotify search/
 * refresh) had zero rate limiting — unmetered calls against the app's own
 * paid API keys. Each now uses checkRateLimit (api/_lib/security.js) with a
 * per-endpoint limit tuned to real usage (search-tier endpoints lower,
 * details/photo higher since they're called less per user action).
 *
 * The refresh-token ownership cases that used to live here went with the
 * Step 2b stage (c) Spotify teardown, along with the spotify-callback and
 * spotify-session-fetch rate-limit cases: those endpoints no longer exist.
 * Spotify SEARCH is still covered below — it survived the teardown because
 * it runs on the server's client_credentials app token and never touched a
 * couple's account. See tests/persistence/spotify-teardown.mjs.
 *
 * Handler-level tests (same pattern as endpoint-auth.mjs)
 * — imports the real handler, invokes it directly with a minimal mock
 * req/res, no live Google/Spotify credentials needed for the rate-limit
 * assertions (each request deliberately omits its required param so the
 * handler short-circuits at its own 400 validation, *after* the rate-limit
 * check has already run — consuming a slot without ever reaching the real
 * external API call).
 *
 * Imports _shared.mjs FIRST so its .env.local side-effect (populating
 * process.env, including BASE44_ADMIN_KEY) runs before any api/*.js
 * module-level env reads.
 */

import { pass, fail } from './_shared.mjs';
import placesHandler from '../../api/places.js';
import placesSearchHandler from '../../api/places-search.js';
import placeDetailsHandler from '../../api/place-details.js';
import placesPhotoHandler from '../../api/places-photo.js';
import spotifySearchHandler from '../../api/spotify-search.js';

// on-signup.js / admin/stats.js / create-portal-session.js construct
// Resend/Stripe clients at module scope, which throw synchronously if
// RESEND_API_KEY / STRIPE_SECRET_KEY are unset — guard with placeholders
// and dynamic-import, same pattern as tests/persistence/stripe-webhook.mjs.
const priorResendKey = process.env.RESEND_API_KEY;
if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
const { default: onSignupHandler } = await import('../../api/on-signup.js');
process.env.RESEND_API_KEY = priorResendKey;

const priorStripeKey = process.env.STRIPE_SECRET_KEY;
if (!process.env.STRIPE_SECRET_KEY) process.env.STRIPE_SECRET_KEY = 'sk_test_persistence_suite_placeholder';
const { default: adminStatsHandler } = await import('../../api/admin/stats.js');
const { default: portalSessionHandler } = await import('../../api/create-portal-session.js');
process.env.STRIPE_SECRET_KEY = priorStripeKey;

/** Minimal Vercel-shaped req/res mock — handlers only touch this surface. */
function mockReqRes({ method = 'GET', ip, query = {}, body = {}, headers = {} } = {}) {
  const req = { method, headers: { 'x-forwarded-for': ip, ...headers }, query, body };
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
    _redirectUrl: null,
    setHeader(k, v) { this._headers[k] = v; return this; },
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    send(obj) { this._json = obj; return this; },
    redirect(urlOrStatus, maybeUrl) {
      // handlers in this repo call res.redirect(url) (2-arg Vercel form not used)
      this._redirectUrl = typeof urlOrStatus === 'string' ? urlOrStatus : maybeUrl;
      this._status = typeof urlOrStatus === 'number' ? urlOrStatus : 302;
      return this;
    },
    end() { return this; },
  };
  return { req, res };
}

/**
 * Fires `limit + 1` requests at `handler` from a single (per-test) fake IP —
 * all deliberately missing their required param so each short-circuits at
 * a 400 *after* the rate-limit check has already consumed a slot — and
 * asserts the (limit + 1)th is rejected with 429, not the underlying 400.
 */
async function assertRateLimited(handler, { limit, ip, reqShape }) {
  let lastStatus = null;
  for (let i = 0; i < limit + 1; i++) {
    const { req, res } = mockReqRes({ ip, ...reqShape });
    await handler(req, res);
    lastStatus = res._status;
  }
  return lastStatus;
}

export async function runRateLimiting() {
  const results = [];

  console.log('\n  Rate limiting — 6 previously-unprotected public functions:\n');

  {
    const status = await assertRateLimited(placesHandler, {
      limit: 20, ip: '203.0.113.10', reqShape: { method: 'GET', query: {} },
    });
    results.push(status === 429
      ? pass('places.js — 21st request in a minute is rate limited', '429')
      : fail('places.js — 21st request in a minute is rate limited', 429, status));
  }

  {
    const status = await assertRateLimited(placesSearchHandler, {
      limit: 20, ip: '203.0.113.11', reqShape: { method: 'POST', body: {} },
    });
    results.push(status === 429
      ? pass('places-search.js — 21st request in a minute is rate limited', '429')
      : fail('places-search.js — 21st request in a minute is rate limited', 429, status));
  }

  {
    const status = await assertRateLimited(placeDetailsHandler, {
      limit: 40, ip: '203.0.113.12', reqShape: { method: 'GET', query: {} },
    });
    results.push(status === 429
      ? pass('place-details.js — 41st request in a minute is rate limited', '429')
      : fail('place-details.js — 41st request in a minute is rate limited', 429, status));
  }

  {
    const status = await assertRateLimited(placesPhotoHandler, {
      limit: 60, ip: '203.0.113.13', reqShape: { method: 'GET', query: {} },
    });
    results.push(status === 429
      ? pass('places-photo.js — 61st request in a minute is rate limited', '429')
      : fail('places-photo.js — 61st request in a minute is rate limited', 429, status));
  }

  {
    const status = await assertRateLimited(spotifySearchHandler, {
      limit: 20, ip: '203.0.113.14', reqShape: { method: 'POST', body: {} },
    });
    results.push(status === 429
      ? pass('spotify-search.js — 21st request in a minute is rate limited', '429')
      : fail('spotify-search.js — 21st request in a minute is rate limited', 429, status));
  }

  // ── Confirm limits are per-IP, not global — a fresh IP is never blocked
  //    by another IP's exhausted bucket. ──
  {
    const { req, res } = mockReqRes({ method: 'GET', ip: '203.0.113.99', query: {} });
    await placesHandler(req, res);
    results.push(res._status !== 429
      ? pass('places.js — a fresh IP is not affected by another IP\'s rate limit', res._status)
      : fail('places.js — a fresh IP is not affected by another IP\'s rate limit', '!== 429', res._status));
  }

  console.log('\n  Rate limiting — security-batch follow-up, 5 more previously-unprotected functions:\n');

  {
    // Missing `email` short-circuits at on-signup.js's own 400 validation,
    // *after* the rate-limit check — never reaches Base44 or Resend.
    const status = await assertRateLimited(onSignupHandler, {
      limit: 5, ip: '203.0.113.20', reqShape: { method: 'POST', body: {} },
    });
    results.push(status === 429
      ? pass('on-signup.js — 6th request in a minute is rate limited', '429')
      : fail('on-signup.js — 6th request in a minute is rate limited', 429, status));
  }

  {
    // No Authorization header — verifyAdmin() returns false without any
    // network call, short-circuiting at 403 after the rate-limit check.
    const status = await assertRateLimited(adminStatsHandler, {
      limit: 20, ip: '203.0.113.21', reqShape: { method: 'GET', query: {} },
    });
    results.push(status === 429
      ? pass('admin/stats.js — 21st request in a minute is rate limited', '429')
      : fail('admin/stats.js — 21st request in a minute is rate limited', 429, status));
  }

  {
    // No Authorization header — verifyBase44User() returns null without any
    // network call, short-circuiting at 401 after the rate-limit check.
    const status = await assertRateLimited(portalSessionHandler, {
      limit: 10, ip: '203.0.113.22', reqShape: { method: 'POST', body: {} },
    });
    results.push(status === 429
      ? pass('create-portal-session.js — 11th request in a minute is rate limited', '429')
      : fail('create-portal-session.js — 11th request in a minute is rate limited', 429, status));
  }



  // ── Confirm normal traffic is unaffected: a single request from a fresh
  //    IP on each new endpoint never gets a 429. ──
  {
    const { req, res } = mockReqRes({ method: 'POST', ip: '203.0.113.40', body: {} });
    await onSignupHandler(req, res);
    results.push(res._status !== 429
      ? pass('on-signup.js — a single normal request is never rate limited', res._status)
      : fail('on-signup.js — a single normal request is never rate limited', '!== 429', res._status));
  }

  {
    const { req, res } = mockReqRes({ method: 'GET', ip: '203.0.113.41', query: {} });
    await adminStatsHandler(req, res);
    results.push(res._status !== 429
      ? pass('admin/stats.js — a single normal request is never rate limited', res._status)
      : fail('admin/stats.js — a single normal request is never rate limited', '!== 429', res._status));
  }

  return results;
}
