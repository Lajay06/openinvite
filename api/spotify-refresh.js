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
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
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
