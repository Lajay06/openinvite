import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Phone, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
const FALLBACK_PHOTO = 'https://res.cloudinary.com/dsr84xknv/image/upload/v1779185627/DTS_Please_Do_Not_Disturb_Fanette_Guilloud_Photos_ID8854_xted4d.jpg';
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6,
};

// Shared with LocationPicker — script only loads once (checked by ID)
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

export default function VenueSearch({
  label,
  venueName,
  address,
  onVenueSelect,
  placeholder = 'Search for a venue…',
  venueDetails = {},
}) {
  const [searchTerm, setSearchTerm]       = useState('');
  const [results, setResults]             = useState([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const [focused, setFocused]             = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const containerRef  = useRef(null);
  const sessionToken  = useRef(null);
  const debounceRef   = useRef(null);

  useEffect(() => { loadGoogleMapsScript(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search trigger
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

  // ── Google Places autocomplete ────────────────────────────────────────────
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
        const ok = window.google.maps.places.PlacesServiceStatus.OK;
        if (status === ok && predictions?.length) {
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

  // ── LLM fallback (when Google Maps not loaded yet) ────────────────────────
  const runLLMFallback = async (query) => {
    setIsSearching(true);
    try {
      const res = await InvokeLLM({
        prompt: `Find up to 5 real wedding venues or event locations matching: "${query}". Return JSON with a "venues" array. Each item: name, address (full), city, country, phone, website (full URL).`,
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
      // Give the async script a moment to load, then fall back
      setTimeout(() => {
        if (window.google?.maps?.places) runGoogleSearch(query);
        else runLLMFallback(query);
      }, 700);
    }
  };

  // ── Fetch full place details (photos, phone, website, maps URL) ───────────
  const resolveGoogleDetails = (placeId, fallbackName, fallbackAddress) => {
    setFetchingDetails(true);
    const dummyDiv = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(dummyDiv);
    svc.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'photos', 'rating', 'url', 'place_id'],
        sessionToken: sessionToken.current,
      },
      (place, status) => {
        sessionToken.current = null;
        setFetchingDetails(false);
        setSearchTerm('');
        setShowResults(false);

        const ok = window.google.maps.places.PlacesServiceStatus.OK;
        let photoUrl = FALLBACK_PHOTO;

        if (status === ok && place) {
          if (place.photos?.length) {
            try { photoUrl = place.photos[0].getUrl({ maxWidth: 800 }); }
            catch { photoUrl = FALLBACK_PHOTO; }
          }
          onVenueSelect({
            venueName: place.name                   || fallbackName,
            address:   place.formatted_address      || fallbackAddress,
            phone:     place.formatted_phone_number || '',
            website:   place.website                || '',
            mapsUrl:   place.url                    || '',
            photoUrl,
            rating:    place.rating ?? null,
            parkingInfo: '',
          });
        } else {
          onVenueSelect({
            venueName: fallbackName, address: fallbackAddress,
            phone: '', website: '', mapsUrl: '',
            photoUrl: FALLBACK_PHOTO, rating: null, parkingInfo: '',
          });
        }
      }
    );
  };

  const handleSelect = (venue) => {
    if (venue.placeId && window.google?.maps?.places) {
      resolveGoogleDetails(venue.placeId, venue.name, venue.address);
    } else {
      // LLM result — no real photo available, use fallback
      onVenueSelect({
        venueName:   venue.name    || '',
        address:     venue.address || '',
        phone:       venue.phone   || '',
        website:     venue.website || '',
        mapsUrl:     '',
        photoUrl:    FALLBACK_PHOTO,
        rating:      null,
        parkingInfo: '',
      });
      setSearchTerm('');
      setShowResults(false);
    }
  };

  const handleClear = () => {
    onVenueSelect({
      venueName: '', address: '', phone: '', website: '',
      mapsUrl: '', photoUrl: '', rating: null, parkingInfo: '',
    });
  };

  // ── Rich venue card (selected state) ──────────────────────────────────────
  if (venueName) {
    const { phone, website, photoUrl, mapsUrl } = venueDetails;
    const displayPhoto = photoUrl || FALLBACK_PHOTO;
    const mapsHref = mapsUrl
      || `https://maps.google.com/?q=${encodeURIComponent((venueName || '') + ' ' + (address || ''))}`;

    return (
      <div style={{ marginBottom: 24 }}>
        {label && <div style={labelStyle}>{label}</div>}

        <div style={{ border: '1px solid #E5E5E5', overflow: 'hidden', position: 'relative' }}>

          {/* Venue photo — always visible (real or fallback) */}
          <img
            src={displayPhoto}
            alt={venueName}
            style={{ width: '100%', height: 224, objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.src = FALLBACK_PHOTO; }}
          />

          {/* Change venue pill — floats top-right over photo */}
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #E5E5E5',
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13, fontFamily: PJS, color: '#999',
              padding: '4px 12px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
            onMouseLeave={e => e.currentTarget.style.color = '#999'}
          >
            Change venue
          </button>

          {/* Card body */}
          <div style={{ padding: 24 }}>
            {/* Name */}
            <p style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: '0 0 12px', fontFamily: PJS }}>
              {venueName}
            </p>

            {/* Address */}
            {address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <MapPin size={16} style={{ color: '#E03553', marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: '#555', margin: 0, fontFamily: PJS, lineHeight: 1.5 }}>
                  {address}
                </p>
              </div>
            )}

            {/* Phone */}
            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Phone size={16} style={{ color: '#E03553', flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: '#555', margin: 0, fontFamily: PJS }}>{phone}</p>
              </div>
            )}

            {/* Divider + links */}
            <div style={{ borderTop: '1px solid #F5F4F0', marginTop: 16, paddingTop: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#E03553', textDecoration: 'underline', fontFamily: PJS }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}
                >
                  <ExternalLink size={14} style={{ flexShrink: 0 }} />
                  Visit website
                </a>
              )}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#E03553', textDecoration: 'underline', fontFamily: PJS }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'none'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'underline'}
              >
                <MapPin size={14} style={{ flexShrink: 0 }} />
                View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Fetching details loading state ─────────────────────────────────────────
  if (fetchingDetails) {
    return (
      <div style={{ marginBottom: 24 }}>
        {label && <div style={labelStyle}>{label}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: 'oi-spin 0.8s linear infinite', flexShrink: 0 }} />
          Loading venue details…
        </div>
        <style>{`@keyframes oi-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Search input + dropdown ────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ marginBottom: 24, position: 'relative' }}>
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
