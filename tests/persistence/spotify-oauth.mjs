/**
 * tests/persistence/spotify-oauth.mjs
 *
 * Covers the fix/spotify-jspdf SECURITY_AUDIT.md item: spotify-callback.js
 * must validate the OAuth `state` param against the value set at
 * authorization start (via the spotify_oauth_state cookie) and reject on
 * mismatch or missing state — before ever touching the `code` param or
 * calling Spotify's token endpoint. This is the classic OAuth login-CSRF
 * defence: without it, an attacker's own valid authorization `code` could
 * be planted in a victim's browser via this callback and silently linked
 * to the victim's account.
 *
 * Handler-level tests only — no real Spotify credentials needed for the
 * rejection paths, since state validation happens before the token
 * exchange call.
 */

import { pass, fail } from './_shared.mjs';
import spotifyCallbackHandler from '../../api/spotify-callback.js';
import spotifySessionFetchHandler from '../../api/spotify-session-fetch.js';

/** Minimal Vercel-shaped req/res mock for redirect-based handlers. */
function mockReqRes({ method = 'GET', query = {}, cookie = '' } = {}) {
  const req = { method, query, headers: cookie ? { cookie } : {} };
  const res = {
    _status: 200,
    _json: null,
    _redirectUrl: null,
    _headers: {},
    setHeader(k, v) { this._headers[k] = v; return this; },
    status(code) { this._status = code; return this; },
    json(obj) { this._json = obj; return this; },
    redirect(url) { this._redirectUrl = url; return this; },
    end() { return this; },
  };
  return { req, res };
}

export async function runSpotifyOAuth() {
  const results = [];

  console.log('\n  Spotify OAuth state validation:\n');

  // ── Missing state entirely (no cookie, no query param) ──────────────────
  {
    const { req, res } = mockReqRes({ query: { code: 'attacker-code' } });
    await spotifyCallbackHandler(req, res);
    const rejected = res._redirectUrl?.includes('spotify_error=state_mismatch');
    results.push(rejected
      ? pass('spotify-callback.js — missing state → rejected', res._redirectUrl)
      : fail('spotify-callback.js — missing state → rejected', `expected state_mismatch redirect, got ${res._redirectUrl}`));
  }

  // ── State present in query but no cookie was ever set ───────────────────
  {
    const { req, res } = mockReqRes({ query: { code: 'attacker-code', state: 'attacker-state' } });
    await spotifyCallbackHandler(req, res);
    const rejected = res._redirectUrl?.includes('spotify_error=state_mismatch');
    results.push(rejected
      ? pass('spotify-callback.js — state with no cookie → rejected', res._redirectUrl)
      : fail('spotify-callback.js — state with no cookie → rejected', `expected state_mismatch redirect, got ${res._redirectUrl}`));
  }

  // ── State present but mismatched against the cookie ─────────────────────
  // Simulates the login-CSRF case: attacker's callback URL carries THEIR
  // own state, but the victim's browser sends the victim's own (different)
  // spotify_oauth_state cookie value from a flow the victim started earlier.
  {
    const { req, res } = mockReqRes({
      query: { code: 'attacker-code', state: 'attacker-state' },
      cookie: 'spotify_oauth_state=victim-state',
    });
    await spotifyCallbackHandler(req, res);
    const rejected = res._redirectUrl?.includes('spotify_error=state_mismatch');
    results.push(rejected
      ? pass('spotify-callback.js — mismatched state → rejected', res._redirectUrl)
      : fail('spotify-callback.js — mismatched state → rejected', `expected state_mismatch redirect, got ${res._redirectUrl}`));
  }

  // ── Matching state clears the mismatch check (falls through to the next
  //    guard — missing SPOTIFY_CLIENT_ID/SECRET in this test env — proving
  //    the rejection is specifically about state, not a blanket reject) ────
  {
    const { req, res } = mockReqRes({
      query: { code: 'some-code', state: 'shared-state' },
      cookie: 'spotify_oauth_state=shared-state',
    });
    await spotifyCallbackHandler(req, res);
    const notStateRejected = !res._redirectUrl?.includes('spotify_error=state_mismatch');
    results.push(notStateRejected
      ? pass('spotify-callback.js — matching state → not rejected as mismatch', res._redirectUrl)
      : fail('spotify-callback.js — matching state → not rejected as mismatch', res._redirectUrl));
  }

  // ── Tokens never appear in the redirect URL ──────────────────────────────
  // Even in the state-mismatch and missing-state cases above, confirm no
  // path ever puts a `spotify=` payload (vs. the generic `connected` flag)
  // in the redirect URL.
  {
    const { req, res } = mockReqRes({ query: { code: 'x', state: 'y' }, cookie: 'spotify_oauth_state=y' });
    await spotifyCallbackHandler(req, res);
    const noTokenInUrl = !res._redirectUrl?.match(/spotify=(?!connected)/);
    results.push(noTokenInUrl
      ? pass('spotify-callback.js — no token material in redirect URL', res._redirectUrl)
      : fail('spotify-callback.js — no token material in redirect URL', res._redirectUrl));
  }

  // ── spotify-session-fetch.js: no pending cookie → connected: false ──────
  console.log('\n  Spotify session fetch (cookie handoff, not URL):\n');
  {
    const { req, res } = mockReqRes({ method: 'GET' });
    await spotifySessionFetchHandler(req, res);
    results.push(res._json?.connected === false
      ? pass('spotify-session-fetch.js — no pending cookie → connected: false', JSON.stringify(res._json))
      : fail('spotify-session-fetch.js — no pending cookie → connected: false', JSON.stringify(res._json)));
  }

  // ── spotify-session-fetch.js: valid pending cookie → returns bundle ─────
  {
    const bundle = { at: 'access-token-123', rt: 'refresh-token-456', exp: Date.now() + 3600000, name: 'Test User', img: '' };
    const cookieVal = Buffer.from(JSON.stringify(bundle)).toString('base64');
    const { req, res } = mockReqRes({ method: 'GET', cookie: `spotify_pending_connection=${cookieVal}` });
    await spotifySessionFetchHandler(req, res);
    const matches = res._json?.connected === true && res._json?.at === bundle.at && res._json?.name === bundle.name;
    results.push(matches
      ? pass('spotify-session-fetch.js — valid cookie → returns bundle', JSON.stringify(res._json))
      : fail('spotify-session-fetch.js — valid cookie → returns bundle', JSON.stringify(res._json)));
  }

  return results;
}
