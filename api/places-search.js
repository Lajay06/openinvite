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

/**
 * WHY THE REASON IS RETURNED, NOT ONLY LOGGED.
 *
 * Google hands us `error_message` in the response body and this proxy used to
 * throw it away, returning the bare status. On 2026-08-30 that cost the whole
 * team the cause of a production outage TWICE in one day: `REQUEST_DENIED` is
 * emitted for a lapsed billing account AND for a key with an HTTP-referrer
 * restriction, and the two are indistinguishable from the status alone. Both
 * times the answer — "You must enable Billing on the Google Cloud Project" —
 * was sitting in a field only someone with Vercel log access could read.
 *
 * An instrument must say what it found. Returning the reason costs nothing and
 * turns a guessing game into a sentence.
 *
 * SAFE TO RETURN: `error_message` is Google's own prose about the project or
 * key configuration. It never contains the key — the key travels in the request
 * URL, which is never echoed here.
 */
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Rate limiting: 20 requests/min per IP — text search, tighter than
  // details/photo since it's the highest-cardinality call (fires per keystroke). ──
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'places-search', 20);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[places-search] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

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
      return res.status(500).json({
        error: `Places API error: ${data.status}`,
        reason: data.error_message || null,
      });
    }

    const places = (data.results || []).slice(0, 8).map(p => ({
      place_id:          p.place_id,
      name:              p.name,
      address:           p.formatted_address || '',
      rating:            p.rating            || null,
      user_ratings_total:p.user_ratings_total || 0,
      price_level:       p.price_level       ?? null,
      // Google's own category signal, forwarded verbatim. Additive only —
      // nothing here is removed or renamed, and none of this endpoint's
      // seven consumers iterate the response keys (they all destructure
      // named fields), so an extra key cannot reach them. Consumers beyond
      // the marketplace: event-details/VenueSearch, shared/VenueSearchPanel,
      // onboarding/OnboardingPathAVendors, GuestSuiteAccommodation,
      // GuestSuiteTransport, and guest-suite/ExperienceGuideTab.
      types:             Array.isArray(p.types) ? p.types : [],
      photo_reference:   p.photos?.[0]?.photo_reference || null,
      maps_url:          `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    }));

    return res.status(200).json({ places });
  } catch (err) {
    console.error('[places-search] Error:', err.message);
    return res.status(500).json({ error: 'Search request failed' });
  }
}
