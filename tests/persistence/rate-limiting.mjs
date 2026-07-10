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
 * Also covers the shared refresh-token ownership check (api/_lib/
 * spotifyAuth.js's isKnownSpotifyRefreshToken): a refresh token not tied to
 * any wedding's stored music.spotifyConnection is rejected before ever
 * exchanging it with Spotify — a leaked/guessed token can't be replayed.
 * Used by BOTH spotify-refresh.js (rejects outright, 401) and
 * spotify-search.js's silent-refresh path (skips the refresh and falls
 * through to the app-token search, same as a failed refresh already did).
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
import { isKnownSpotifyRefreshToken } from '../../api/_lib/spotifyAuth.js';

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

  console.log('\n  spotify-search.js — same ownership check on its silent-refresh path:\n');

  {
    // The shared check itself, direct: an unknown token is never "known."
    const known = await isKnownSpotifyRefreshToken(`unknown-shared-check-${Date.now()}`, '[test]');
    results.push(known === false
      ? pass('isKnownSpotifyRefreshToken — unknown token resolves false', 'false')
      : fail('isKnownSpotifyRefreshToken — unknown token resolves false', false, known));
  }

  {
    // An expired accessToken + an unknown refreshToken must never reach
    // Spotify's token endpoint to attempt a silent refresh — the response
    // must never carry a newToken (which only appears when a refresh
    // actually succeeded). Whatever happens next (a real app-token search,
    // or a 503 if Spotify creds aren't configured in this environment) is
    // fine — the only thing under test is that the refresh was skipped.
    const { req, res } = mockReqRes({
      method: 'POST',
      ip: '203.0.113.52',
      body: {
        q: 'test song',
        accessToken: 'stale-access-token',
        refreshToken: `unknown-search-path-${Date.now()}-does-not-exist`,
        expiresAt: Date.now() - 60_000, // already expired, forces the refresh branch
      },
    });
    await spotifySearchHandler(req, res);
    results.push(!res._json?.newToken
      ? pass('spotify-search.js — unknown refresh token is never silently exchanged', `${res._status}, no newToken in response`)
      : fail('spotify-search.js — unknown refresh token is never silently exchanged', 'no newToken', JSON.stringify(res._json)));
  }

  return results;
}
