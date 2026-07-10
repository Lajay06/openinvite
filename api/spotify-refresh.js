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
 *   BASE44_ADMIN_KEY — server-side-only Base44 service token, used to
 *     verify the presented refresh token is actually tied to a real
 *     wedding's stored Spotify connection before spending a token exchange
 *     on it (see isKnownRefreshToken below).
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

/**
 * Confirms the presented refresh token is tied to a real wedding's stored
 * Spotify connection (WeddingDetails.music.spotifyConnection.refreshToken,
 * written by api/spotify-callback.js after a successful OAuth connect) —
 * a leaked or guessed token with no matching record is rejected outright,
 * before we ever call Spotify's token endpoint, so it can't be replayed by
 * an arbitrary caller who merely knows the value.
 */
async function isKnownRefreshToken(refreshToken) {
  if (!BASE44_ADMIN_KEY) {
    console.error('[spotify-refresh] BASE44_ADMIN_KEY env var is not set — cannot verify token ownership');
    return false;
  }
  const query = encodeURIComponent(JSON.stringify({ 'music.spotifyConnection.refreshToken': refreshToken }));
  const findRes = await fetch(
    `${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${query}`,
    { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } },
  );
  if (!findRes.ok) {
    console.error('[spotify-refresh] Ownership lookup failed:', findRes.status);
    return false;
  }
  const payload = await findRes.json();
  const list = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);
  return list.length > 0;
}

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
  const known = await isKnownRefreshToken(refreshToken);
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
