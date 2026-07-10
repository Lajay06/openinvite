/**
 * POST /api/spotify-refresh
 *
 * Refreshes a Spotify access token using the stored refresh token.
 * Called server-side by spotify-search.js; may also be called directly
 * by the client for proactive token renewal.
 *
 * Body: { refreshToken: string }
 * Response: { accessToken: string, expiresAt: number }
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   BASE44_ADMIN_KEY — server-side-only Base44 service token, used by
 *     isKnownSpotifyRefreshToken (api/_lib/spotifyAuth.js) to verify the
 *     presented refresh token is actually tied to a real wedding's stored
 *     Spotify connection before spending a token exchange on it.
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';
import { isKnownSpotifyRefreshToken } from './_lib/spotifyAuth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: 10 requests/min per IP — tighter than the search-tier
  // endpoints, since legitimate use is infrequent (once per token expiry,
  // not a searchy call) and this endpoint is the more security-sensitive
  // of the two (it mints a fresh access token from a long-lived secret). ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'spotify-refresh', 10);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[spotify-refresh] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  // ── Ownership check — reject any refresh token not tied to a known wedding ──
  const known = await isKnownSpotifyRefreshToken(refreshToken, '[spotify-refresh]');
  if (!known) {
    console.warn('[spotify-refresh] Rejected — refresh token not tied to any known wedding record');
    return res.status(401).json({ error: 'Unknown refresh token' });
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Spotify credentials not configured on server' });
  }

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    const data = await tokenRes.json();
    if (!data.access_token) {
      return res.status(401).json({ error: 'Token refresh failed — user may need to reconnect' });
    }

    return res.status(200).json({
      accessToken: data.access_token,
      expiresAt:   Date.now() + (data.expires_in || 3600) * 1000,
    });
  } catch (err) {
    console.error('[spotify-refresh] Error:', err.message);
    return res.status(500).json({ error: 'Refresh request failed' });
  }
}
