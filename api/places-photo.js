/**
 * GET /api/places-photo?ref=PHOTO_REF&maxwidth=600
 *
 * Proxies Google Places photos so the API key stays server-side.
 *
 * Handles both:
 *   - Places API (New): ref = "places/PLACE_ID/photos/PHOTO_ID" (resource name)
 *   - Places API (Legacy): ref = raw photo_reference string
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Rate limiting: 60 requests/min per IP — a single results page can
  // request many photos at once (one per venue card), so this needs the
  // highest limit of the four Places proxies. ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'places-photo', 60);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[places-photo] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { ref, maxwidth = '600' } = req.query || {};
  if (!ref) return res.status(400).json({ error: 'ref is required' });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(503).json({ error: 'Google Places API not configured' });

  // Places API (New) resource names start with "places/"
  const isNewFormat = ref.startsWith('places/');
  const url = isNewFormat
    ? `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${maxwidth}&key=${key}`
    : `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(ref)}&key=${key}`;

  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) return res.status(502).json({ error: 'Photo fetch failed' });

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('[places-photo] Error:', err.message);
    return res.status(500).json({ error: 'Photo proxy failed' });
  }
}
