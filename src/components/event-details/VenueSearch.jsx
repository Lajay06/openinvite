import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Phone, Loader2, Clock, Star, Car } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 6,
};

const row = {
  display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
};

const iconStyle = { color: '#E03553', width: 16, height: 16, flexShrink: 0, marginTop: 2 };

const linkStyle = {
  fontSize: 14, color: '#E03553', textDecoration: 'underline',
  fontFamily: PJS, lineHeight: 1.5, background: 'none', border: 'none',
  cursor: 'pointer', padding: 0,
};

// Shared with LocationPicker — only one script tag is ever injected (checked by ID)
function loadGoogleMapsScript() {
  if (window.google?.maps?.places) return;
  if (document.getElementById('gm-script')) return;
  const script = document.createElement('script');
  script.id = 'gm-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=__gmInit`;
  script.async = true;
  script.defer = true;
  window.__gmInit = () => {};
  document.head.appendChild(script);
}

// Extract today's opening hours string from the Places weekday_text array.
// weekday_text is Mon–Sun indexed (0 = Monday). getDay() returns 0 = Sunday.
function getTodayHours(openingHours) {
  const texts = openingHours?.weekday_text;
  if (!texts?.length) return '';
  const dow = new Date().getDay(); // 0=Sun
  const idx = dow === 0 ? 6 : dow - 1; // convert to Mon-based
  return (texts[idx] || '').replace(/^[^:]+:\s*/, ''); // strip "Monday: " prefix
}

// Get the best available photo URL from a PlacePhoto array.
// Tries accessing the underlying photo_reference first, then falls back to getUrl().
function getPhotoUrl(photos) {
  if (!photos?.length) return '';
  const photo = photos[0];
  try {
    const ref = photo['photo_reference'] || photo.photo_reference;
    if (ref) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_MAPS_API_KEY}`;
    }
    return photo.getUrl({ maxWidth: 800 }) || '';
  } catch {
    return '';
  }
}

export default function VenueSearch({
  label,
  venueName,
  address,
  onVenueSelect,
  placeholder = 'Search for a venue…',
  venueDetails = {},
}) {
  const [searchTerm, setSearchTerm]           = useState('');
  const [results, setResults]                 = useState([]);
  const [isSearching, setIsSearching]         = useState(false);
  const [showResults, setShowResults]         = useState(false);
  const [focused, setFocused]                 = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [searchError, setSearchError]         = useState('');

  const containerRef = useRef(null);
  const sessionToken = useRef(null);
  const debounceRef  = useRef(null);

  useEffect(() => { loadGoogleMapsScript(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search — triggers after 400ms of no typing
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      setSearchError('');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchTerm), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  // ── LLM search (primary, always reliable) ────────────────────────────────
  // Returns the results array so callers can chain.
  const runLLMSearch = async (query) => {
    console.log('[VenueSearch] Running LLM search for:', query);
    try {
      const res = await InvokeLLM({
        prompt: `Find up to 5 real wedding venues or event locations matching: "${query}". Return JSON with a "venues" array. Each item needs: name, address (full street address), city, country, phone (if known), website (full URL if known).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            venues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:    { type: 'string' },
                  address: { type: 'string' },
                  city:    { type: 'string' },
                  country: { type: 'string' },
                  phone:   { type: 'string' },
                  website: { type: 'string' },
                },
              },
            },
          },
        },
      });
      const venues = (res?.venues || []).map(v => ({
        name:    v.name,
        address: [v.address, v.city, v.country].filter(Boolean).join(', '),
        phone:   v.phone   || '',
        website: v.website || '',
        isLLM:   true,
      }));
      console.log('[VenueSearch] LLM returned', venues.length, 'venues');
      return venues;
    } catch (err) {
      console.error('[VenueSearch] LLM search error:', err);
      return [];
    }
  };

  // ── Google Places autocomplete (enhancement, with timeout guard) ──────────
  const runGoogleSearch = (query) => {
    return new Promise((resolve) => {
      let settled = false;

      // Safety net: if callback never fires within 4 s, resolve with empty
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[VenueSearch] Google Places timed out for query:', query);
          resolve([]);
        }
      }, 4000);

      try {
        if (!sessionToken.current) {
          sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        }
        const svc = new window.google.maps.places.AutocompleteService();
        svc.getPlacePredictions(
          { input: query, sessionToken: sessionToken.current, types: ['establishment'] },
          (predictions, status) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);

            const OK = window.google.maps.places.PlacesServiceStatus.OK;
            console.log('[VenueSearch] Google Places status:', status, '| count:', predictions?.length ?? 0);

            if (status === OK && predictions?.length) {
              resolve(predictions.map(p => ({
                placeId: p.place_id,
                name:    p.structured_formatting?.main_text      || p.description,
                address: p.structured_formatting?.secondary_text || '',
              })));
            } else {
              resolve([]);
            }
          }
        );
      } catch (err) {
        console.error('[VenueSearch] Google Places error:', err);
        clearTimeout(timer);
        if (!settled) { settled = true; resolve([]); }
      }
    });
  };

  // ── Main search orchestrator ──────────────────────────────────────────────
  // Always sets isSearching(true) immediately, always clears it when done.
  const runSearch = async (query) => {
    setIsSearching(true);
    setSearchError('');

    try {
      // Prefer Google Places (has placeId for rich details); fall back to LLM
      let venues = [];

      if (window.google?.maps?.places) {
        venues = await runGoogleSearch(query);
        console.log('[VenueSearch] Using Google results:', venues.length);
      }

      if (!venues.length) {
        venues = await runLLMSearch(query);
        console.log('[VenueSearch] Using LLM results:', venues.length);
      }

      setResults(venues);
      setShowResults(venues.length > 0);

      if (!venues.length) {
        setSearchError('No results found. Try a different search.');
        setShowResults(true); // show the error state in the dropdown
      }
    } catch (err) {
      console.error('[VenueSearch] runSearch error:', err);
      setSearchError('Search unavailable. Please try again.');
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Resolve full place details via Google Places API ──────────────────────
  // Has a 5 s timeout guard so fetchingDetails never gets permanently stuck.
  const resolveGoogleDetails = (placeId, fallbackName, fallbackAddress) => {
    setFetchingDetails(true);
    let settled = false;

    const fallbackAndFinish = () => {
      onVenueSelect({
        venueName: fallbackName, address: fallbackAddress,
        phone: '', website: '', mapsUrl: '',
        photoUrl: '', rating: null,
        openingHoursToday: '', parkingInfo: '',
      });
      setSearchTerm('');
      setShowResults(false);
      setFetchingDetails(false);
    };

    // 5-second timeout guard
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn('[VenueSearch] getDetails timed out for placeId:', placeId);
        fallbackAndFinish();
      }
    }, 5000);

    try {
      const dummyDiv = document.createElement('div');
      const svc = new window.google.maps.places.PlacesService(dummyDiv);
      svc.getDetails(
        {
          placeId,
          fields: [
            'name', 'formatted_address', 'formatted_phone_number',
            'website', 'photos', 'rating', 'url', 'place_id',
            'opening_hours', 'types',
          ],
          sessionToken: sessionToken.current,
        },
        (place, status) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          sessionToken.current = null;
          setFetchingDetails(false);
          setSearchTerm('');
          setShowResults(false);

          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          console.log('[VenueSearch] getDetails status:', status, '| name:', place?.name);

          if (status === OK && place) {
            const photoUrl        = getPhotoUrl(place.photos);
            const todayHours      = getTodayHours(place.opening_hours);
            const hasParking      = place.types?.some(t => t.includes('parking')) ?? false;

            onVenueSelect({
              venueName:         place.name                   || fallbackName,
              address:           place.formatted_address      || fallbackAddress,
              phone:             place.formatted_phone_number || '',
              website:           place.website                || '',
              mapsUrl:           place.url                    || '',
              photoUrl,
              rating:            place.rating ?? null,
              openingHoursToday: todayHours,
              parkingInfo:       hasParking ? 'Parking available on site' : '',
            });
          } else {
            fallbackAndFinish();
          }
        }
      );
    } catch (err) {
      console.error('[VenueSearch] getDetails error:', err);
      clearTimeout(timer);
      if (!settled) { settled = true; fallbackAndFinish(); }
    }
  };

  const handleSelect = (venue) => {
    if (venue.placeId && window.google?.maps?.places) {
      resolveGoogleDetails(venue.placeId, venue.name, venue.address);
    } else {
      // LLM result — use data directly, no photo
      onVenueSelect({
        venueName:         venue.name    || '',
        address:           venue.address || '',
        phone:             venue.phone   || '',
        website:           venue.website || '',
        mapsUrl:           '',
        photoUrl:          '',
        rating:            null,
        openingHoursToday: '',
        parkingInfo:       '',
      });
      setSearchTerm('');
      setShowResults(false);
    }
  };

  const handleClear = () => {
    onVenueSelect({
      venueName: '', address: '', phone: '', website: '',
      mapsUrl: '', photoUrl: '', rating: null,
      openingHoursToday: '', parkingInfo: '',
    });
  };

  // ── Rich venue card (selected state) ──────────────────────────────────────
  if (venueName) {
    const { phone, website, photoUrl, mapsUrl, rating, openingHoursToday, parkingInfo } = venueDetails;
    const mapsHref = mapsUrl
      || `https://maps.google.com/?q=${encodeURIComponent((venueName || '') + ' ' + (address || ''))}`;

    return (
      <div style={{ marginBottom: 24, maxWidth: 672 }}>
        {label && <div style={labelStyle}>{label}</div>}

        <div style={{ border: '1px solid #E5E5E5', overflow: 'hidden' }}>

          {/* Photo — only rendered when a real URL exists */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt={venueName}
              style={{ width: '100%', height: 224, objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}

          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS }}>
              {venueName}
            </p>

            {address && (
              <div style={row}>
                <MapPin style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS, lineHeight: 1.5 }}>{address}</span>
              </div>
            )}

            {phone && (
              <div style={row}>
                <Phone style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>{phone}</span>
              </div>
            )}

            {openingHoursToday && (
              <div style={row}>
                <Clock style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>{openingHoursToday}</span>
              </div>
            )}

            {rating != null && (
              <div style={row}>
                <Star style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>{rating} / 5</span>
              </div>
            )}

            {parkingInfo && (
              <div style={row}>
                <Car style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>{parkingInfo}</span>
              </div>
            )}

            {website && (
              <div style={row}>
                <ExternalLink style={iconStyle} />
                <a href={website} target="_blank" rel="noopener noreferrer" style={linkStyle}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}>
                  Visit website
                </a>
              </div>
            )}

            <div style={row}>
              <MapPin style={iconStyle} />
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" style={linkStyle}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}>
                View on Google Maps
              </a>
            </div>
          </div>
        </div>

        <button
          onClick={handleClear}
          style={{
            marginTop: 10, background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', fontSize: 13, fontFamily: PJS, color: 'rgba(10,10,10,0.6)',
            display: 'inline-block', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.6)'}
        >
          Change venue
        </button>
      </div>
    );
  }

  // ── Fetching details loading state ─────────────────────────────────────────
  if (fetchingDetails) {
    return (
      <div style={{ marginBottom: 24, maxWidth: 672 }}>
        {label && <div style={labelStyle}>{label}</div>}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 0', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, fontSize: 13,
        }}>
          <Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite', flexShrink: 0 }} />
          Loading venue details…
        </div>
        <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ marginBottom: 24, position: 'relative', maxWidth: 672 }}>
      {label && <div style={labelStyle}>{label}</div>}

      <div style={{ position: 'relative' }}>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onFocus={() => { setFocused(true); if (results.length || searchError) setShowResults(true); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%', border: 'none',
            borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`,
            background: 'transparent', padding: '6px 28px 6px 0',
            fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none',
            fontFamily: PJS, boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
        />
        {isSearching && (
          <Loader2
            size={14}
            style={{
              position: 'absolute', right: 4, top: '50%', marginTop: -7,
              color: 'rgba(10,10,10,0.35)', animation: 'oi-spin 0.8s linear infinite',
            }}
          />
        )}
      </div>

      {/* Dropdown — results or error/empty state */}
      {showResults && !isSearching && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          background: '#FFFFFF', border: '1px solid #E5E5E5',
          zIndex: 50, maxHeight: 280, overflowY: 'auto',
        }}>
          {results.length > 0 ? (
            results.map((venue, i) => (
              <div
                key={i}
                onMouseDown={() => handleSelect(venue)}
                style={{
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  borderBottom: i < results.length - 1 ? '1px solid #F5F4F0' : 'none',
                  cursor: 'pointer', background: '#FFFFFF', fontFamily: PJS,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F4F0'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
              >
                <MapPin size={14} style={{ color: '#E03553', marginTop: 2, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {venue.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {venue.address}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS }}>
                {searchError || 'No results found. Try a different search.'}
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
