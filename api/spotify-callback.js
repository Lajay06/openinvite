/**
 * GET /api/spotify-callback
 *
 * Spotify Authorization Code callback. Validates the `state` param against
 * the value the browser sent when the flow started (via cookie — Vercel
 * functions are stateless across invocations, so a server-side session
 * store can't reliably survive from the authorize-start request to this
 * one, but a cookie the browser holds and resends can). Exchanges `code`
 * for access + refresh tokens, fetches the user's Spotify profile, then
 * hands the token bundle to the browser via a short-lived HttpOnly cookie
 * — never via a redirect URL query param, which would land in the browser
 * address bar and history.
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID      – from Spotify Developer Dashboard
 *   SPOTIFY_CLIENT_SECRET  – from Spotify Developer Dashboard
 *
 * Optional env var:
 *   APP_URL                – override app base URL (e.g. https://openinvite.com.au)
 *                            Falls back to deriving from request headers.
 */

import { parseCookies, serializeCookie, expireCookie, checkRateLimit, getClientIp } from './_lib/security.js';

const STATE_COOKIE = 'spotify_oauth_state';
const PENDING_COOKIE = 'spotify_pending_connection';

export default async function handler(req, res) {
  const { code, error, state } = req.query;

  // Derive the app base URL from the request so this works in dev + prod
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host || 'openinvite.com.au';
  const APP_URL = process.env.APP_URL || `${proto}://${host}`;
  const REDIRECT_URI = 'https://www.openinvite.com.au/api/spotify-callback';

  // ── Rate limiting: 10 requests/min per IP ──────────────────────────────
  // No auth check at all on this endpoint (only CSRF state validation
  // below) — each hit triggers 2 external calls to Spotify (token exchange
  // + profile fetch), so it's worth bounding even though state validation
  // already blocks the classic OAuth login-CSRF abuse.
  const ip = getClientIp(req);
  const { limited } = checkRateLimit(ip, 'spotify-callback', 10);
  if (limited) {
    console.warn('[spotify-callback] Rate limited:', ip);
    return res.redirect(`${APP_URL}/Music?spotify_error=rate_limited`);
  }

  // The state cookie is single-use regardless of outcome — clear it now.
  res.setHeader('Set-Cookie', expireCookie(STATE_COOKIE));

  if (error) {
    console.warn('[spotify-callback] Spotify returned error:', error);
    return res.redirect(`${APP_URL}/Music?spotify_error=${encodeURIComponent(error)}`);
  }

  // ── Validate state before doing anything else ───────────────────────────
  // Rejects on both a missing state (someone hitting this endpoint directly)
  // and a mismatched one (the classic OAuth login-CSRF: an attacker starts
  // their OWN authorization flow, gets a valid code for their OWN Spotify
  // account, then tricks a victim into visiting this callback with that
  // code — without state validation, the victim's browser would silently
  // save the attacker's Spotify connection as if it were their own).
  const cookies = parseCookies(req);
  const expectedState = cookies[STATE_COOKIE];
  if (!state || !expectedState || state !== expectedState) {
    console.warn('[spotify-callback] state mismatch or missing — rejecting', {
      hasState: !!state, hasExpected: !!expectedState, matched: state === expectedState,
    });
    return res.redirect(`${APP_URL}/Music?spotify_error=state_mismatch`);
  }

  if (!code) {
    return res.redirect(`${APP_URL}/Music?spotify_error=no_code`);
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[spotify-callback] Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    return res.redirect(`${APP_URL}/Music?spotify_error=server_misconfigured`);
  }

  // ── Exchange code for tokens ──────────────────────────────────────────────
  let tokens;
  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });
    tokens = await tokenRes.json();
  } catch (err) {
    console.error('[spotify-callback] Token exchange error:', err.message);
    return res.redirect(`${APP_URL}/Music?spotify_error=token_exchange_failed`);
  }

  if (!tokens.access_token) {
    console.error('[spotify-callback] No access_token in response:', tokens);
    return res.redirect(`${APP_URL}/Music?spotify_error=no_access_token`);
  }

  // ── Fetch Spotify profile ─────────────────────────────────────────────────
  let displayName = 'Spotify User';
  let imageUrl    = '';
  try {
    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    displayName = profile.display_name || profile.id || 'Spotify User';
    imageUrl    = profile.images?.[0]?.url || '';
  } catch (err) {
    console.warn('[spotify-callback] Could not fetch Spotify profile:', err.message);
  }

  // ── Hand off via a short-lived HttpOnly cookie, never the URL ──────────────
  // The redirect target carries only a generic "connected" flag — no token
  // material ever appears in the browser's address bar or history. The
  // client fetches api/spotify-session-fetch immediately to retrieve the
  // actual bundle from the response body, and that endpoint clears this
  // cookie on first read so it can't be replayed.
  const payload = JSON.stringify({
    at:   tokens.access_token,
    rt:   tokens.refresh_token,
    exp:  Date.now() + (tokens.expires_in || 3600) * 1000,
    name: displayName,
    img:  imageUrl,
  });
  res.setHeader('Set-Cookie', [
    expireCookie(STATE_COOKIE),
    serializeCookie(PENDING_COOKIE, Buffer.from(payload).toString('base64'), { maxAge: 120, httpOnly: true }),
  ]);

  return res.redirect(`${APP_URL}/Music?spotify=connected`);
}
