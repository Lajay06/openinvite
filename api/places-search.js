/**
 * POST /api/places-search
 *
 * Backend proxy for Google Places Text Search.
 * Keeps GOOGLE_PLACES_API_KEY off the browser bundle.
 *
 * Body: { q: string, location?: string, lat?: number, lng?: number }
 *   lat + lng → geographic bias via the Places API location+radius params
 *   location  → appended to query as "near <location>" (venue city fallback)
 * Response: { places: Place[] }
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { q, location, lat, lng } = req.body || {};
  if (!q?.trim()) return res.status(400).json({ error: 'q is required' });

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(503).json({ error: 'Google Places API not configured — add GOOGLE_PLACES_API_KEY env var' });

  let url;
  if (lat != null && lng != null) {
    // User's device coordinates — bias results to that location with a 50 km radius
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q.trim())}&location=${lat},${lng}&radius=50000&key=${key}`;
  } else {
    // Fall back to venue city appended to query
    const query = location ? `${q.trim()} near ${location}` : q.trim();
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('[places-search] API error:', data.status, data.error_message);
      return res.status(500).json({ error: `Places API error: ${data.status}` });
    }

    const places = (data.results || []).slice(0, 8).map(p => ({
      place_id:          p.place_id,
      name:              p.name,
      address:           p.formatted_address || '',
      rating:            p.rating            || null,
      user_ratings_total:p.user_ratings_total || 0,
      price_level:       p.price_level       ?? null,
      photo_reference:   p.photos?.[0]?.photo_reference || null,
      maps_url:          `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    }));

    return res.status(200).json({ places });
  } catch (err) {
    console.error('[places-search] Error:', err.message);
    return res.status(500).json({ error: 'Search request failed' });
  }
}
