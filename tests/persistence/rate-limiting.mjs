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
 * Also covers spotify-refresh.js's new ownership check: a refresh token not
 * tied to any wedding's stored music.spotifyConnection is rejected before
 * ever exchanging it with Spotify — a leaked/guessed token can't be replayed.
 *
 * Handler-level tests (same pattern as endpoint-auth.mjs / spotify-oauth.mjs)
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
import spotifyRefreshHandler from '../../api/spotify-refresh.js';

/** Minimal Vercel-shaped req/res mock — handlers only touch this surface. */
function mockReqRes({ method = 'GET', ip, query = {}, body = {} } = {}) {
  const req = { method, headers: { 'x-forwarded-for': ip }, query, body };
  const res = {
    _status: 200,
    _json: null,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; return this; },
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    send(obj) { this._json = obj; return this; },
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

  {
    const status = await assertRateLimited(spotifyRefreshHandler, {
      limit: 10, ip: '203.0.113.15', reqShape: { method: 'POST', body: {} },
    });
    results.push(status === 429
      ? pass('spotify-refresh.js — 11th request in a minute is rate limited', '429')
      : fail('spotify-refresh.js — 11th request in a minute is rate limited', 429, status));
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

  console.log('\n  spotify-refresh.js — refresh token ownership check:\n');

  {
    // A syntactically-plausible but entirely made-up refresh token, tied to
    // no wedding's stored music.spotifyConnection — must be rejected before
    // ever reaching Spotify's token endpoint.
    const { req, res } = mockReqRes({
      method: 'POST',
      ip: '203.0.113.50',
      body: { refreshToken: `unknown-refresh-token-${Date.now()}-does-not-exist` },
    });
    await spotifyRefreshHandler(req, res);
    results.push(res._status === 401 && res._json?.error === 'Unknown refresh token'
      ? pass('spotify-refresh.js — unknown refresh token is rejected (401)', JSON.stringify(res._json))
      : fail('spotify-refresh.js — unknown refresh token is rejected (401)', '401 {"error":"Unknown refresh token"}', `${res._status} ${JSON.stringify(res._json)}`));
  }

  {
    // Missing refreshToken entirely — 400, distinct from the 401 ownership
    // rejection, and must not even attempt the ownership lookup.
    const { req, res } = mockReqRes({ method: 'POST', ip: '203.0.113.51', body: {} });
    await spotifyRefreshHandler(req, res);
    results.push(res._status === 400
      ? pass('spotify-refresh.js — missing refreshToken → 400 (not 401)', res._status)
      : fail('spotify-refresh.js — missing refreshToken → 400 (not 401)', 400, res._status));
  }

  return results;
}
