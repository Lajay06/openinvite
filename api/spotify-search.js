/**
 * POST /api/spotify-search
 *
 * Server-side proxy for Spotify track search. Keeps all credentials
 * off the browser bundle.
 *
 * Two modes:
 *   1. User token   — pass { q, accessToken, refreshToken, expiresAt }
 *                     The server auto-refreshes if expired and returns the
 *                     new token in { newToken } so the client can persist it.
 *   2. App token    — pass only { q }; server uses client_credentials grant.
 *                     Requires SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET.
 *
 * Response:
 *   200 { tracks: SpotifyTrack[], newToken?: { accessToken, expiresAt } }
 *   401 { error } — the presented accessToken was rejected; client should
 *     prompt to reconnect (see src/components/music/SpotifyModal.jsx, which
 *     also clears the stored connection on this specific status).
 *   502 { error } — Spotify itself returned a non-200/non-JSON response
 *     (rate limit, outage, edge block, etc.) — every such status is caught
 *     before .json() is ever called on it (parseJsonResponse()), the fix
 *     for the production "'text/html' is not a valid JavaScript MIME type"
 *     crash (2026-08-02): the old code only guarded status 401.
 *
 * Required env vars (for app-token fallback):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   BASE44_ADMIN_KEY — used by isKnownSpotifyRefreshToken (api/_lib/
 *     spotifyAuth.js) to verify a presented refreshToken is tied to a real
 *     wedding's stored Spotify connection before silently exchanging it.
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { isKnownSpotifyRefreshToken } from './_lib/spotifyAuth.js';

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

async function refreshUserToken(refreshToken, clientId, clientSecret) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
  });
  const data = await parseJsonResponse(res, 'Spotify token-refresh request');
  if (!data.access_token) throw new Error('Token refresh failed');
  return {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in || 3600) * 1000,
  };
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

  const { q, accessToken, refreshToken, expiresAt } = req.body || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  let token     = null;
  let newToken  = null;

  if (accessToken) {
    // Use the user's token; refresh silently if expired
    const expired = expiresAt && Date.now() > expiresAt - 60_000;
    if (expired && refreshToken && clientId && clientSecret) {
      // A refresh token not tied to any known wedding's Spotify connection
      // is never exchanged, even silently here. Falls through to the
      // app-token path exactly as a failed refresh already does, so an
      // unknown/leaked token gets no different treatment than "refresh
      // unavailable." This inline refresh is now the ONLY refresh path in
      // the app — api/spotify-refresh.js (a second, orphaned implementation
      // nothing ever called) was deleted rather than kept in parallel.
      const known = await isKnownSpotifyRefreshToken(refreshToken, '[spotify-search]');
      if (known) {
        try {
          const refreshed = await refreshUserToken(refreshToken, clientId, clientSecret);
          token    = refreshed.accessToken;
          newToken = refreshed;
        } catch {
          // Refresh failed — fall through to app token
        }
      } else {
        console.warn('[spotify-search] Refresh token not tied to any known wedding record — skipping silent refresh');
      }
    } else {
      token = accessToken;
    }
  }

  if (!token && clientId && clientSecret) {
    // Fallback: client credentials (no user context needed for search)
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

    const response = { tracks };
    if (newToken) response.newToken = newToken;
    return res.status(200).json(response);
  } catch (err) {
    console.error('[spotify-search] Search error:', err.message);
    return res.status(500).json({ error: 'Search request failed' });
  }
}
