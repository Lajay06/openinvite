import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Phone, Loader2, Clock, Star, Car } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6,
};

// Row: flex items-start gap-3 mb-3
const row = {
  display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12,
};

// Icon: text-[#E03553] w-4 h-4 flex-shrink-0 mt-0.5
const iconStyle = { color: '#E03553', width: 16, height: 16, flexShrink: 0, marginTop: 2 };

// Link style
const linkStyle = {
  fontSize: 14, color: '#E03553', textDecoration: 'underline',
  fontFamily: PJS, lineHeight: 1.5, background: 'none', border: 'none',
  cursor: 'pointer', padding: 0,
};

// Shared with LocationPicker — script loads only once (checked by ID)
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

// Extract today's hours from opening_hours.weekday_text
// weekday_text is Mon–Sun (index 0=Mon … 6=Sun); getDay() is 0=Sun…6=Sat
function getTodayHours(openingHours) {
  const texts = openingHours?.weekday_text;
  if (!texts?.length) return '';
  const day = new Date().getDay(); // 0=Sun
  const idx = day === 0 ? 6 : day - 1; // convert to Mon-based index
  const text = texts[idx] || '';
  // Strip the day name prefix ("Monday: 9:00 AM – 5:00 PM" → "9:00 AM – 5:00 PM")
  return text.replace(/^[^:]+:\s*/, '');
}

// Build photo URL from place.photos[0]
// Tries photo_reference first (internal data), then getUrl() from the JS SDK
function getPhotoUrl(photos) {
  if (!photos?.length) return '';
  const photo = photos[0];
  try {
    // photo_reference is present in the underlying API data even if not in the public typedefs
    const ref = photo['photo_reference'] || photo.photo_reference;
    if (ref) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(ref)}&key=${GOOGLE_MAPS_API_KEY}`;
    }
    // Fall back to getUrl() — returns the same CDN URL internally
    const url = photo.getUrl({ maxWidth: 800 });
    return url || '';
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
  const [searchTerm, setSearchTerm]         = useState('');
  const [results, setResults]               = useState([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [showResults, setShowResults]       = useState(false);
  const [focused, setFocused]               = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
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

  // Debounced search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchTerm), 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm]);

  // ── Google Places autocomplete ─────────────────────────────────────────────
  const runGoogleSearch = (query) => {
    setIsSearching(true);
    if (!sessionToken.current) {
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    const svc = new window.google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input: query, sessionToken: sessionToken.current, types: ['establishment'] },
      (predictions, status) => {
        setIsSearching(false);
        const OK = window.google.maps.places.PlacesServiceStatus.OK;
        if (status === OK && predictions?.length) {
          setResults(predictions.map(p => ({
            placeId: p.place_id,
            name:    p.structured_formatting?.main_text      || p.description,
            address: p.structured_formatting?.secondary_text || '',
          })));
          setShowResults(true);
        } else {
          setResults([]);
          runLLMFallback(query);
        }
      }
    );
  };

  // ── LLM fallback ──────────────────────────────────────────────────────────
  const runLLMFallback = async (query) => {
    setIsSearching(true);
    try {
      const res = await InvokeLLM({
        prompt: `Find up to 5 real wedding venues or event locations matching: "${query}". Return JSON with a "venues" array. Each: name, address (full), city, country, phone, website (full URL).`,
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
      setResults(venues);
      if (venues.length) setShowResults(true);
    } catch (err) {
      console.error('VenueSearch LLM fallback:', err);
      setResults([]);
    }
    setIsSearching(false);
  };

  const runSearch = (query) => {
    if (window.google?.maps?.places) {
      runGoogleSearch(query);
    } else {
      setTimeout(() => {
        if (window.google?.maps?.places) runGoogleSearch(query);
        else runLLMFallback(query);
      }, 700);
    }
  };

  // ── Resolve full place details from Google ─────────────────────────────────
  const resolveGoogleDetails = (placeId, fallbackName, fallbackAddress) => {
    setFetchingDetails(true);
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
        sessionToken.current = null;
        setFetchingDetails(false);
        setSearchTerm('');
        setShowResults(false);

        const OK = window.google.maps.places.PlacesServiceStatus.OK;
        if (status === OK && place) {
          const photoUrl = getPhotoUrl(place.photos);
          const todayHours = getTodayHours(place.opening_hours);
          // Parking: check if 'parking' appears in the place types
          const hasParking = place.types?.some(t => t.includes('parking')) ?? false;

          onVenueSelect({
            venueName:        place.name                   || fallbackName,
            address:          place.formatted_address      || fallbackAddress,
            phone:            place.formatted_phone_number || '',
            website:          place.website                || '',
            mapsUrl:          place.url                    || '',
            photoUrl,
            rating:           place.rating ?? null,
            openingHoursToday: todayHours,
            parkingInfo:      hasParking ? 'Parking available on site' : '',
          });
        } else {
          onVenueSelect({
            venueName: fallbackName, address: fallbackAddress,
            phone: '', website: '', mapsUrl: '',
            photoUrl: '', rating: null,
            openingHoursToday: '', parkingInfo: '',
          });
        }
      }
    );
  };

  const handleSelect = (venue) => {
    if (venue.placeId && window.google?.maps?.places) {
      resolveGoogleDetails(venue.placeId, venue.name, venue.address);
    } else {
      // LLM result — no photo, no hours
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

  // ── Rich venue card ────────────────────────────────────────────────────────
  if (venueName) {
    const {
      phone, website, photoUrl, mapsUrl,
      rating, openingHoursToday, parkingInfo,
    } = venueDetails;

    const mapsHref = mapsUrl
      || `https://maps.google.com/?q=${encodeURIComponent((venueName || '') + ' ' + (address || ''))}`;

    return (
      <div style={{ marginBottom: 24, maxWidth: 672 }}>
        {label && <div style={labelStyle}>{label}</div>}

        {/* Card */}
        <div style={{ border: '1px solid #E5E5E5', overflow: 'hidden' }}>

          {/* Photo — only if a real URL was obtained */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt={venueName}
              style={{ width: '100%', height: 224, objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}

          {/* Card body */}
          <div style={{ padding: 24 }}>

            {/* Venue name */}
            <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS }}>
              {venueName}
            </p>

            {/* Address */}
            {address && (
              <div style={row}>
                <MapPin style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS, lineHeight: 1.5 }}>
                  {address}
                </span>
              </div>
            )}

            {/* Phone */}
            {phone && (
              <div style={row}>
                <Phone style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>
                  {phone}
                </span>
              </div>
            )}

            {/* Today's hours */}
            {openingHoursToday && (
              <div style={row}>
                <Clock style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>
                  {openingHoursToday}
                </span>
              </div>
            )}

            {/* Rating */}
            {rating != null && (
              <div style={row}>
                <Star style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>
                  {rating} / 5
                </span>
              </div>
            )}

            {/* Parking */}
            {parkingInfo && (
              <div style={row}>
                <Car style={iconStyle} />
                <span style={{ fontSize: 14, color: '#555', fontFamily: PJS }}>
                  {parkingInfo}
                </span>
              </div>
            )}

            {/* Website */}
            {website && (
              <div style={row}>
                <ExternalLink style={iconStyle} />
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}
                >
                  Visit website
                </a>
              </div>
            )}

            {/* Google Maps */}
            <div style={row}>
              <MapPin style={iconStyle} />
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}
              >
                View on Google Maps
              </a>
            </div>

          </div>
        </div>

        {/* Change venue — below card, not overlaid */}
        <button
          onClick={handleClear}
          style={{
            marginTop: 10, background: 'none', border: 'none', padding: 0,
            cursor: 'pointer', fontSize: 13, fontFamily: PJS, color: '#999',
            display: 'inline-block', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
          onMouseLeave={e => e.currentTarget.style.color = '#999'}
        >
          Change venue
        </button>
      </div>
    );
  }

  // ── Fetching details state ─────────────────────────────────────────────────
  if (fetchingDetails) {
    return (
      <div style={{ marginBottom: 24, maxWidth: 672 }}>
        {label && <div style={labelStyle}>{label}</div>}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '14px 0', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontSize: 13,
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
          onFocus={() => { setFocused(true); if (results.length) setShowResults(true); }}
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

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          background: '#FFFFFF', border: '1px solid #E5E5E5',
          zIndex: 50, maxHeight: 280, overflowY: 'auto',
        }}>
          {results.map((venue, i) => (
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
                <p style={{ fontSize: 12, color: '#999', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {venue.address}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {showResults && searchTerm.length >= 2 && results.length === 0 && !isSearching && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
          background: '#FFFFFF', border: '1px solid #E5E5E5', zIndex: 50,
          padding: '16px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>
            No venues found
          </p>
        </div>
      )}

      <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
