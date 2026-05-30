/**
 * GET /api/spotify-callback
 *
 * Spotify Authorization Code callback. Exchanges the `code` param for access +
 * refresh tokens, fetches the user's Spotify profile, then redirects back to
 * the Music page with the token bundle encoded as base64 in a query param.
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID      – from Spotify Developer Dashboard
 *   SPOTIFY_CLIENT_SECRET  – from Spotify Developer Dashboard
 *
 * Optional env var:
 *   APP_URL                – override app base URL (e.g. https://openinvite.com.au)
 *                            Falls back to deriving from request headers.
 */

export default async function handler(req, res) {
  const { code, error, state } = req.query;

  // Derive the app base URL from the request so this works in dev + prod
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host || 'openinvite.com.au';
  const APP_URL = process.env.APP_URL || `${proto}://${host}`;
  const REDIRECT_URI = `${APP_URL}/api/spotify-callback`;

  if (error) {
    console.warn('[spotify-callback] Spotify returned error:', error);
    return res.redirect(`${APP_URL}/Music?spotify_error=${encodeURIComponent(error)}`);
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

  // ── Encode and redirect ───────────────────────────────────────────────────
  const payload = Buffer.from(JSON.stringify({
    at:   tokens.access_token,
    rt:   tokens.refresh_token,
    exp:  Date.now() + (tokens.expires_in || 3600) * 1000,
    name: displayName,
    img:  imageUrl,
  })).toString('base64');

  return res.redirect(`${APP_URL}/Music?spotify=${encodeURIComponent(payload)}`);
}
