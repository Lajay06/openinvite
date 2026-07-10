/**
 * GET /api/place-details?place_id=...
 *
 * Backend proxy for Google Places Details.
 * Keeps GOOGLE_PLACES_API_KEY off the browser bundle.
 *
 * Response: { place }
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limiting: 40 requests/min per IP — one call per user selection
  // (much lower-cardinality than search), so a generous limit is safe. ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'place-details', 40);
  res.setHeader('X-RateLimit-Limit', '40');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[place-details] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { place_id } = req.query || {};
  if (!place_id) return res.status(400).json({ error: 'place_id is required' });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(503).json({ error: 'Google Places API not configured' });

  const fields = 'place_id,name,formatted_address,rating,user_ratings_total,price_level,formatted_phone_number,website,photos,opening_hours,types,geometry';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=${fields}&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(500).json({ error: `Places API error: ${data.status}` });
    }

    const p = data.result;
    return res.status(200).json({
      place: {
        place_id:           p.place_id,
        name:               p.name,
        address:            p.formatted_address || '',
        rating:             p.rating || null,
        user_ratings_total: p.user_ratings_total || 0,
        price_level:        p.price_level ?? null,
        phone:              p.formatted_phone_number || null,
        website:            p.website || null,
        photo_reference:    p.photos?.[0]?.photo_reference || null,
        maps_url:           `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
        types:              p.types || [],
      },
    });
  } catch (err) {
    console.error('[place-details] Error:', err.message);
    return res.status(500).json({ error: 'Request failed' });
  }
}
