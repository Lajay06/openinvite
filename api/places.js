/**
 * GET /api/places?q=restaurants&location=Sydney+Australia&radius=5000
 *
 * Google Places Text Search proxy — keeps API key server-side.
 * Returns mock data when GOOGLE_PLACES_API_KEY is not set so the UI
 * is testable without a key (mock:true flag in response).
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 */

const MOCK_PLACES = [
  { place_id: 'mock_1', name: 'The Harbour Kitchen', address: '1 Circular Quay, Sydney NSW', rating: 4.6, user_ratings_total: 842, price_level: 3, photo_reference: null, maps_url: 'https://maps.google.com', types: ['restaurant', 'food'] },
  { place_id: 'mock_2', name: 'Sunset Bar & Grill', address: '22 Beach Rd, Sydney NSW',  rating: 4.4, user_ratings_total: 514, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['bar', 'restaurant'] },
  { place_id: 'mock_3', name: 'Grand Hotel Sydney',  address: '30 Hunter St, Sydney NSW',  rating: 4.5, user_ratings_total: 1203, price_level: 4, photo_reference: null, maps_url: 'https://maps.google.com', types: ['lodging'] },
  { place_id: 'mock_4', name: 'City Rooftop Café',   address: '5 King St, Sydney NSW',     rating: 4.7, user_ratings_total: 328, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['cafe', 'food'] },
  { place_id: 'mock_5', name: 'Botanical Gardens Walk', address: 'Mrs Macquaries Rd, Sydney NSW', rating: 4.8, user_ratings_total: 4500, price_level: 0, photo_reference: null, maps_url: 'https://maps.google.com', types: ['park', 'tourist_attraction'] },
  { place_id: 'mock_6', name: 'Opera House Tours',   address: 'Bennelong Point, Sydney NSW', rating: 4.9, user_ratings_total: 8200, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['tourist_attraction', 'point_of_interest'] },
  { place_id: 'mock_7', name: 'Central Taxi & Rideshare', address: 'Central Station, Sydney NSW', rating: 4.1, user_ratings_total: 112, price_level: 1, photo_reference: null, maps_url: 'https://maps.google.com', types: ['taxi_stand', 'transit_station'] },
  { place_id: 'mock_8', name: 'Budget Car Rentals',  address: '80 Elizabeth St, Sydney NSW', rating: 4.0, user_ratings_total: 265, price_level: 2, photo_reference: null, maps_url: 'https://maps.google.com', types: ['car_rental'] },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, location, radius = '5000' } = req.query || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return res.status(200).json({ places: MOCK_PLACES, mock: true });
  }

  const query = location ? `${q.trim()} near ${location.trim()}` : q.trim();
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&radius=${radius}&key=${key}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[places] API error:', data.status, data.error_message);
      return res.status(200).json({ places: MOCK_PLACES, mock: true, apiError: data.status });
    }

    const places = (data.results || []).slice(0, 10).map(p => ({
      place_id:           p.place_id,
      name:               p.name,
      address:            p.formatted_address || '',
      rating:             p.rating || null,
      user_ratings_total: p.user_ratings_total || 0,
      price_level:        p.price_level ?? null,
      photo_reference:    p.photos?.[0]?.photo_reference || null,
      maps_url:           `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      types:              p.types || [],
    }));

    return res.status(200).json({ places, mock: false });
  } catch (err) {
    console.error('[places] Error:', err.message);
    return res.status(200).json({ places: MOCK_PLACES, mock: true });
  }
}
