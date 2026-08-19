import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Phone, Loader2, Clock, Star, Car } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

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

// fix/account-checkout-and-maps-key: server-side proxy only, matching
// VendorMarketplace.jsx/VenueSearchPanel.jsx's already-correct pattern —
// GOOGLE_PLACES_API_KEY never leaves api/places-search.js, api/
// place-details.js, api/places-photo.js. This used to load the Google
// Maps JS SDK directly with a hardcoded, then VITE_-env-exposed key
// (CLAUDE.md forbids client-side Google keys) — that script tag and every
// window.google.maps.places.* call are gone.
function photoProxy(ref, maxwidth = 800) {
  if (!ref) return '';
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${maxwidth}`;
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
  const debounceRef  = useRef(null);

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

  // ── Places search via the server-side proxy (enhancement, LLM is the fallback) ──
  const runPlacesSearch = async (query) => {
    try {
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query }),
      });
      if (!res.ok) {
        console.warn('[VenueSearch] places-search failed:', res.status);
        return [];
      }
      const data = await res.json();
      return (data.places || []).map(p => ({
        placeId: p.place_id,
        name:    p.name,
        address: p.address || '',
      }));
    } catch (err) {
      console.error('[VenueSearch] places-search error:', err);
      return [];
    }
  };

  // ── Main search orchestrator ──────────────────────────────────────────────
  // Always sets isSearching(true) immediately, always clears it when done.
  const runSearch = async (query) => {
    setIsSearching(true);
    setSearchError('');

    try {
      // Prefer real Places results (has placeId for rich details); fall back to LLM
      let venues = await runPlacesSearch(query);
      console.log('[VenueSearch] Using Places results:', venues.length);

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

  // ── Resolve full place details via the server-side proxy ──────────────────
  const resolvePlaceDetails = async (placeId, fallbackName, fallbackAddress) => {
    setFetchingDetails(true);
    try {
      const res = await fetch(`/api/place-details?place_id=${encodeURIComponent(placeId)}`);
      if (!res.ok) throw new Error(`place-details failed (${res.status})`);
      const { place } = await res.json();

      onVenueSelect({
        venueName:         place.name    || fallbackName,
        address:           place.address || fallbackAddress,
        phone:             place.phone   || '',
        website:           place.website || '',
        mapsUrl:           place.maps_url || '',
        photoUrl:          photoProxy(place.photo_reference),
        rating:            place.rating ?? null,
        openingHoursToday: getTodayHours(place.opening_hours),
        parkingInfo:       place.types?.some(t => t.includes('parking')) ? 'Parking available on site' : '',
      });
    } catch (err) {
      console.error('[VenueSearch] place-details error:', err);
      onVenueSelect({
        venueName: fallbackName, address: fallbackAddress,
        phone: '', website: '', mapsUrl: '',
        photoUrl: '', rating: null,
        openingHoursToday: '', parkingInfo: '',
      });
    } finally {
      setSearchTerm('');
      setShowResults(false);
      setFetchingDetails(false);
    }
  };

  const handleSelect = (venue) => {
    if (venue.placeId) {
      resolvePlaceDetails(venue.placeId, venue.name, venue.address);
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
              color: 'rgba(10,10,10,0.6)', animation: 'oi-spin 0.8s linear infinite',
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
