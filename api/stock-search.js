/**
 * GET /api/stock-search?q=florals&page=1
 *
 * Server-side proxy for Pexels photo search — keeps PEXELS_API_KEY off the
 * browser bundle entirely (no VITE_ prefix, never exposed to client code).
 * Mirrors api/places-search.js's shape: a thin query-forwarding proxy that
 * returns only the fields the picker actually needs.
 *
 * Image bytes themselves are NOT proxied here — MediaLibraryModal.jsx
 * fetches the chosen photo's own Pexels CDN URL directly from the browser
 * (images.pexels.com permits this; that's Pexels' whole hotlink/embed
 * model) and re-uploads it through the existing base44 upload path, so a
 * wedding site never ends up hot-linking a Pexels URL long-term.
 *
 * Response: { photos: [{ id, alt, photographer, thumbnail, full }], hasMore }
 *        or { error: '...' }
 *
 * Required env var: PEXELS_API_KEY — server-side only.
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Per-IP throttle on top of Pexels' own 200 req/hour per-key limit — the
  // client already debounces search-as-you-type, this just protects
  // against anything hammering the endpoint directly.
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'stock-search', 20, 60_000);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { q, page = '1' } = req.query || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const key = process.env.PEXELS_API_KEY;
  if (!key) return res.status(503).json({ error: 'Stock photo search is not configured' });

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q.trim())}&per_page=24&page=${encodeURIComponent(page)}&orientation=landscape`;
    const response = await fetch(url, { headers: { Authorization: key } });

    if (response.status === 429) {
      // Pexels' own 200/hour key limit has been hit — surface a friendly,
      // distinct message rather than a generic failure.
      return res.status(429).json({ error: 'Stock photo search is busy right now — please try again shortly.' });
    }
    if (!response.ok) {
      return res.status(502).json({ error: 'Stock photo search failed' });
    }

    const data = await response.json();
    const photos = (data.photos || []).map(p => ({
      id: p.id,
      alt: p.alt || '',
      photographer: p.photographer || '',
      thumbnail: p.src?.medium || p.src?.small || p.src?.original,
      full: p.src?.large2x || p.src?.large || p.src?.original,
    }));

    return res.status(200).json({ photos, hasMore: !!data.next_page });
  } catch (err) {
    console.error('[stock-search] Error:', err.message);
    return res.status(500).json({ error: 'Stock photo search failed' });
  }
}
