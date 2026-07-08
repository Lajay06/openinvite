/**
 * GET /api/spotify-session-fetch
 *
 * Retrieves the Spotify token bundle api/spotify-callback.js handed off via
 * a short-lived HttpOnly cookie, rather than a redirect URL query param.
 * Called by Music.jsx immediately after the browser lands back on /Music
 * with the generic ?spotify=connected flag (which carries no token
 * material itself). Single-use: the cookie is cleared as soon as it's
 * read, so it can't be replayed even within its short 2-minute window.
 *
 * Response: 200 { connected: true, at, rt, exp, name, img }
 *        or 200 { connected: false }  (no pending cookie — nothing to fetch)
 */

import { parseCookies, expireCookie } from './_lib/security.js';

const PENDING_COOKIE = 'spotify_pending_connection';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const raw = cookies[PENDING_COOKIE];

  // Clear it immediately regardless of outcome — single-use.
  res.setHeader('Set-Cookie', expireCookie(PENDING_COOKIE));

  if (!raw) {
    return res.status(200).json({ connected: false });
  }

  try {
    const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    return res.status(200).json({ connected: true, ...data });
  } catch (err) {
    console.error('[spotify-session-fetch] Malformed pending cookie:', err.message);
    return res.status(200).json({ connected: false });
  }
}
