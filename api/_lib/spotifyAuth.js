/**
 * api/_lib/spotifyAuth.js
 *
 * Shared refresh-token ownership check for every endpoint that accepts a
 * Spotify refreshToken directly from the client (api/spotify-refresh.js,
 * api/spotify-search.js's silent-refresh path) — one implementation so both
 * reject a leaked/guessed token identically, rather than one being hardened
 * and the other quietly sharing the same replay risk.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

/**
 * Confirms the presented refresh token is tied to a real wedding's stored
 * Spotify connection (WeddingDetails.music.spotifyConnection.refreshToken,
 * written by api/spotify-callback.js after a successful OAuth connect) —
 * a leaked or guessed token with no matching record is rejected outright,
 * before the caller ever exchanges it with Spotify's token endpoint, so it
 * can't be replayed by an arbitrary caller who merely knows the value.
 *
 * @param {string} refreshToken
 * @param {string} [logPrefix] — e.g. '[spotify-refresh]', for console output
 * @returns {Promise<boolean>}
 */
export async function isKnownSpotifyRefreshToken(refreshToken, logPrefix = '[spotifyAuth]') {
  if (!BASE44_ADMIN_KEY) {
    console.error(`${logPrefix} BASE44_ADMIN_KEY env var is not set — cannot verify token ownership`);
    return false;
  }
  const query = encodeURIComponent(JSON.stringify({ 'music.spotifyConnection.refreshToken': refreshToken }));
  const findRes = await fetch(
    `${BASE44_API}/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${query}`,
    { headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` } },
  );
  if (!findRes.ok) {
    console.error(`${logPrefix} Ownership lookup failed:`, findRes.status);
    return false;
  }
  const payload = await findRes.json();
  const list = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);
  return list.length > 0;
}
