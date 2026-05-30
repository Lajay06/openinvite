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
 *   { tracks: SpotifyTrack[], newToken?: { accessToken, expiresAt } }
 *
 * Required env vars (for app-token fallback):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 */

let cachedAppToken = null; // { token, expires }

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
  const data = await res.json();
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
  const data = await res.json();
  if (!data.access_token) throw new Error('Token refresh failed');
  return {
    accessToken: data.access_token,
    expiresAt:   Date.now() + (data.expires_in || 3600) * 1000,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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
      try {
        const refreshed = await refreshUserToken(refreshToken, clientId, clientSecret);
        token    = refreshed.accessToken;
        newToken = refreshed;
      } catch {
        // Refresh failed — fall through to app token
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

  // ── Spotify search ────────────────────────────────────────────────────────
  try {
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q.trim())}&type=track&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (spotifyRes.status === 401) {
      // Token rejected — tell client to reconnect
      return res.status(401).json({ error: 'Spotify token invalid — please reconnect' });
    }

    const data = await spotifyRes.json();
    const tracks = (data.tracks?.items || []).map(t => ({
      id:           t.id,
      name:         t.name,
      artists:      t.artists.map(a => a.name).join(', '),
      album:        t.album.name,
      duration_ms:  t.duration_ms,
      preview_url:  t.preview_url || null,
      artwork_url:  t.album.images?.[1]?.url || t.album.images?.[0]?.url || '',
    }));

    const response = { tracks };
    if (newToken) response.newToken = newToken;
    return res.status(200).json(response);
  } catch (err) {
    console.error('[spotify-search] Search error:', err.message);
    return res.status(500).json({ error: 'Search request failed' });
  }
}
