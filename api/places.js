/**
 * GET /api/places?q=restaurants&location=Sydney+Australia
 *
 * Google Places API (New) Text Search proxy — keeps API key server-side.
 * Returns mock data when GOOGLE_PLACES_API_KEY is not set so the UI
 * is testable without a key (mock:true flag in response).
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 */

const MOCK_PLACES = [
  { place_id: 'mock_1', name: 'The Harbour Kitchen', address: '1 Circular Quay, Sydney NSW', rating: 4.6, user_ratings_total: 842, price_level: 3, photo_reference: null, maps_url: 'https://maps.google.com', types: ['restaurant'] },
  { place_id: 'mock_2', name: 'Sunset Bar & Grill',  address: '22 Beach Rd, Sydney NSW',     rating: 4.4, user_ratings_total: 514, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['bar'] },
  { place_id: 'mock_3', name: 'Grand Hotel Sydney',  address: '30 Hunter St, Sydney NSW',    rating: 4.5, user_ratings_total: 1203, price_level: 4, photo_reference: null, maps_url: 'https://maps.google.com', types: ['lodging'] },
  { place_id: 'mock_4', name: 'City Rooftop Café',   address: '5 King St, Sydney NSW',       rating: 4.7, user_ratings_total: 328, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['cafe'] },
  { place_id: 'mock_5', name: 'Botanical Gardens',   address: 'Mrs Macquaries Rd, Sydney NSW', rating: 4.8, user_ratings_total: 4500, price_level: 0, photo_reference: null, maps_url: 'https://maps.google.com', types: ['park'] },
  { place_id: 'mock_6', name: 'Opera House Tours',   address: 'Bennelong Point, Sydney NSW',  rating: 4.9, user_ratings_total: 8200, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['tourist_attraction'] },
  { place_id: 'mock_7', name: 'Central Taxi Stand',  address: 'Central Station, Sydney NSW', rating: 4.1, user_ratings_total: 112, price_level: 1, photo_reference: null, maps_url: 'https://maps.google.com', types: ['taxi_stand'] },
  { place_id: 'mock_8', name: 'Budget Car Rentals',  address: '80 Elizabeth St, Sydney NSW', rating: 4.0, user_ratings_total: 265, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['car_rental'] },
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
      body: JSON.stringify({ textQuery, maxResultCount: 10 }),
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
