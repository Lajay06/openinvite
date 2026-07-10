/**
 * GET /api/places?q=restaurants&location=Sydney+Australia
 *
 * Google Places API (New) Text Search proxy — keeps API key server-side.
 * Returns mock data when GOOGLE_PLACES_API_KEY is not set so the UI
 * is testable without a key (mock:true flag in response).
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 */

import { checkRateLimit, getClientIp } from './_lib/security.js';

const MOCK_PLACES = [
  { place_id: 'mock_1', name: 'Golden Hour Photography Studio', address: '12 Clarence St, Sydney NSW 2000', rating: 4.9, user_ratings_total: 312, price_level: 3, photo_reference: null, maps_url: 'https://maps.google.com/?q=Golden+Hour+Photography+Sydney', types: ['photographer'] },
  { place_id: 'mock_2', name: 'Bloom & Wild Florals',           address: '88 Bourke St, Melbourne VIC 3000', rating: 4.8, user_ratings_total: 189, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=Bloom+Wild+Florals+Melbourne', types: ['florist'] },
  { place_id: 'mock_3', name: 'Feast & Gather Catering Co.',    address: '5 Harris St, Pyrmont NSW 2009',    rating: 4.7, user_ratings_total: 456, price_level: 3, photo_reference: null, maps_url: 'https://maps.google.com/?q=Feast+Gather+Catering+Sydney', types: ['food'] },
  { place_id: 'mock_4', name: 'The Film Couple',                address: 'Online — Australia-wide',          rating: 4.9, user_ratings_total: 134, price_level: 3, photo_reference: null, maps_url: 'https://maps.google.com/?q=The+Film+Couple+Wedding', types: ['videographer'] },
  { place_id: 'mock_5', name: 'Sweet Layers Bakery',            address: '22 Surrey Hills, Brisbane QLD 4000', rating: 4.8, user_ratings_total: 267, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=Sweet+Layers+Bakery+Brisbane', types: ['bakery'] },
  { place_id: 'mock_6', name: 'La Maison Wedding Venue',        address: '1 Domain Rd, South Yarra VIC 3141', rating: 4.6, user_ratings_total: 571, price_level: 4, photo_reference: null, maps_url: 'https://maps.google.com/?q=La+Maison+Venue+Melbourne', types: ['event_venue'] },
  { place_id: 'mock_7', name: 'Radiant Bridal Beauty Bar',      address: '46 King St, Newtown NSW 2042',      rating: 4.9, user_ratings_total: 318, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=Radiant+Beauty+Bar+Sydney', types: ['beauty_salon'] },
  { place_id: 'mock_8', name: 'DJ Max & Live Music Co.',        address: '300 Brunswick St, Fitzroy VIC 3065', rating: 4.6, user_ratings_total: 201, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=DJ+Max+Melbourne', types: ['entertainment'] },
  { place_id: 'mock_9', name: 'Classic Car Hire Sydney',        address: '10 O\'Riordan St, Alexandria NSW 2015', rating: 4.5, user_ratings_total: 76, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=Classic+Car+Hire+Sydney', types: ['car_rental'] },
  { place_id: 'mock_10', name: 'Heartfelt Ceremonies',          address: '15 Chapel St, Windsor VIC 3181',    rating: 4.8, user_ratings_total: 178, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com/?q=Heartfelt+Ceremonies+Melbourne', types: ['celebrant'] },
];

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE:           0,
  PRICE_LEVEL_INEXPENSIVE:    1,
  PRICE_LEVEL_MODERATE:       2,
  PRICE_LEVEL_EXPENSIVE:      3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limiting: 20 requests/min per IP — text search, tighter than
  // details/photo since it's the highest-cardinality call (fires per keystroke). ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'places', 20);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[places] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const { q, location } = req.query || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(200).json({ places: MOCK_PLACES, mock: true });
  }

  const textQuery = location ? `${q.trim()} near ${location.trim()}` : q.trim();

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.googleMapsUri,places.photos',
      },
      body: JSON.stringify({ textQuery, maxResultCount: 20 }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('[places] API error:', data.error.status, data.error.message);
      return res.status(200).json({ places: MOCK_PLACES, mock: true, apiError: data.error.status });
    }

    const places = (data.places || []).map(p => ({
      place_id:           p.id,
      name:               p.displayName?.text || '',
      address:            p.formattedAddress || '',
      rating:             p.rating || null,
      user_ratings_total: p.userRatingCount || 0,
      price_level:        PRICE_LEVEL_MAP[p.priceLevel] ?? null,
      photo_reference:    p.photos?.[0]?.name || null,
      maps_url:           p.googleMapsUri || `https://maps.google.com/?q=${encodeURIComponent(p.displayName?.text || '')}`,
      types:              [],
    }));

    return res.status(200).json({ places, mock: false });
  } catch (err) {
    console.error('[places] Error:', err.message);
    return res.status(200).json({ places: MOCK_PLACES, mock: true });
  }
}
