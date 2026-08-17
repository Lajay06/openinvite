/**
 * POST /api/spotify-search
 *
 * Server-side proxy for Spotify track search. Keeps all credentials
 * off the browser bundle.
 *
 * ONE mode: app token. Pass { q }; the server uses a client_credentials
 * grant from SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET. Search needs no user
 * context, and every caller already used this path — GuestMusic.jsx and
 * SpotifySearch.jsx always sent only { q }.
 *
 * The user-token mode was removed in the Step 2b stage (c) Spotify teardown.
 * It was the only place in the app that accepted a Spotify refreshToken from
 * a client, and it existed solely to serve WeddingDetails.music
 * .spotifyConnection, which is being purged. Removing it deletes the last
 * code path that reads a stored Spotify token. Guest song-request search is
 * unaffected: it never used it.
 *
 * Response:
 *   200 { tracks: SpotifyTrack[] }
 *   502 { error } — Spotify itself returned a non-200/non-JSON response
 *     (rate limit, outage, edge block, etc.) — every such status is caught
 *     before .json() is ever called on it (parseJsonResponse()), the fix
 *     for the production "'text/html' is not a valid JavaScript MIME type"
 *     crash (2026-08-02): the old code only guarded status 401.
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

let cachedAppToken = null; // { token, expires }

/**
 * Parses a fetch Response as JSON only when it's actually ok and actually
 * JSON — throws a clear, specific Error otherwise instead of letting an
 * error/edge-block response (HTML, empty body, etc.) crash into .json()'s
 * own unhelpful SyntaxError. This is the exact gap that caused the
 * production "'text/html' is not a valid JavaScript MIME type" crash
 * (2026-08-02): the old code only special-cased status 401 before parsing,
 * so any OTHER non-200 (403/429/5xx/edge block) fell straight into an
 * unguarded .json() call.
 */
async function parseJsonResponse(res, context) {
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`${context} returned ${res.status}: ${bodyText.slice(0, 200)}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const bodyText = await res.text().catch(() => '');
    throw new Error(`${context} returned non-JSON content-type "${contentType}": ${bodyText.slice(0, 200)}`);
  }
  return res.json();
}

async function getAppToken(clientId, clientSecret) {
  if (cachedAppToken && Date.now() < cachedAppToken.expires) return cachedAppToken.token;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await parseJsonResponse(res, 'Spotify app-token request');
  if (!data.access_token) throw new Error('App token request failed');
  cachedAppToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedAppToken.token;
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limiting: 20 requests/min per IP — search-as-you-type, same
  // tier as the Places search proxies. ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'spotify-search', 20);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[spotify-search] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  // Only q is read. accessToken/refreshToken/expiresAt are deliberately
  // ignored if a stale client still sends them — the teardown removed the
  // user-token path, and silently ignoring beats 400-ing a caller whose only
  // sin is running yesterday's bundle.
  const { q } = req.body || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  let token = null;
  if (clientId && clientSecret) {
    try {
      token = await getAppToken(clientId, clientSecret);
    } catch (err) {
      console.error('[spotify-search] App token error:', err.message);
    }
  }

  if (!token) {
    return res.status(503).json({ error: 'Spotify credentials not available' });
  }

  // ── Spotify search (limit 10, returns artwork_url + artwork_url_small) ────
  try {
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q.trim())}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (spotifyRes.status === 401) {
      // Token rejected — tell client to reconnect
      return res.status(401).json({ error: 'Spotify token invalid — please reconnect' });
    }

    let data;
    try {
      data = await parseJsonResponse(spotifyRes, 'Spotify search request');
    } catch (err) {
      // Every non-401 error status (403/429/5xx) or an unexpected non-JSON
      // 200 lands here with a clean, specific error instead of the old
      // unguarded .json() crashing into a generic 500 SyntaxError.
      console.error('[spotify-search] Spotify response error:', err.message);
      return res.status(502).json({ error: 'Spotify search is temporarily unavailable — please try again' });
    }
    const tracks = (data.tracks?.items || []).map(t => ({
      id:           t.id,
      name:         t.name,
      artists:      t.artists.map(a => a.name).join(', '),
      album:        t.album.name,
      duration_ms:  t.duration_ms,
      preview_url:  t.preview_url || null,
      artwork_url:       t.album.images?.[1]?.url || t.album.images?.[0]?.url || '',
      artwork_url_small: t.album.images?.[2]?.url || t.album.images?.[1]?.url || '',
      explicit:     !!t.explicit,
      spotify_url:  t.external_urls?.spotify || '',
    }));

    return res.status(200).json({ tracks });
  } catch (err) {
    console.error('[spotify-search] Search error:', err.message);
    return res.status(500).json({ error: 'Search request failed' });
  }
}
