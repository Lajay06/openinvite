import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Phone, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6,
};

export default function VenueSearch({
  label,
  venueName,
  address,
  onVenueSelect,
  placeholder = 'Search for a venue…',
  venueDetails = {},
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);

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
    if (!searchTerm || searchTerm.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(() => runSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const runSearch = async (query) => {
    setIsSearching(true);
    try {
      const response = await InvokeLLM({
        prompt: `Search for wedding venues or event locations matching: "${query}". Return up to 5 real venues as JSON. For each venue include: name, address (full street address), city, country, phone, website (full URL), maps_url (google maps link), photo_url (a real publicly accessible photo URL of this venue if available, otherwise empty string), rating (numeric out of 5 if known, otherwise null), parking_info (brief parking description near this venue if known, otherwise empty string).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            venues: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name:         { type: 'string' },
                  address:      { type: 'string' },
                  city:         { type: 'string' },
                  country:      { type: 'string' },
                  phone:        { type: 'string' },
                  website:      { type: 'string' },
                  maps_url:     { type: 'string' },
                  photo_url:    { type: 'string' },
                  rating:       { type: 'number' },
                  parking_info: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setResults(response?.venues || []);
      setShowResults(true);
    } catch (err) {
      console.error('VenueSearch error:', err);
      setResults([]);
    }
    setIsSearching(false);
  };

  const handleSelect = (venue) => {
    onVenueSelect({
      venueName:   venue.name        || '',
      address:     venue.address     || '',
      city:        venue.city        || '',
      country:     venue.country     || '',
      phone:       venue.phone       || '',
      website:     venue.website     || '',
      mapsUrl:     venue.maps_url    || '',
      photoUrl:    venue.photo_url   || '',
      rating:      venue.rating      ?? null,
      parkingInfo: venue.parking_info || '',
    });
    setSearchTerm('');
    setShowResults(false);
  };

  const handleClear = () => {
    onVenueSelect({
      venueName: '', address: '', city: '', country: '',
      phone: '', website: '', mapsUrl: '', photoUrl: '', rating: null, parkingInfo: '',
    });
  };

  // ── Rich venue card (selected state) ──────────────────────────────────────
  if (venueName) {
    const { phone, website, photoUrl, mapsUrl } = venueDetails;
    const mapsHref = mapsUrl
      || `https://maps.google.com/?q=${encodeURIComponent((venueName || '') + ' ' + (address || ''))}`;

    return (
      <div style={{ marginBottom: 20 }}>
        {label && <div style={labelStyle}>{label}</div>}
        <div style={{ border: '1px solid #E5E5E5', overflow: 'hidden', position: 'relative' }}>

          {/* Photo or placeholder */}
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={venueName}
              style={{ width: '100%', height: 192, objectFit: 'cover', display: 'block' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div style={{
            width: '100%', height: 192,
            background: '#F0F0EE',
            display: photoUrl ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <MapPin size={32} style={{ color: 'rgba(10,10,10,0.15)' }} />
          </div>

          {/* Change venue */}
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer',
              fontSize: 12, fontFamily: PJS, color: 'rgba(10,10,10,0.55)',
              padding: '4px 12px', borderRadius: 999,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#0A0A0A'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.55)'}
          >
            Change venue
          </button>

          {/* Card body */}
          <div style={{ padding: '20px 24px' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', fontFamily: PJS }}>
              {venueName}
            </p>

            {address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                <MapPin size={13} style={{ color: '#E03553', marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#555', margin: 0, fontFamily: PJS, lineHeight: 1.5 }}>
                  {address}
                </p>
              </div>
            )}

            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Phone size={13} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#555', margin: 0, fontFamily: PJS }}>{phone}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#E03553', textDecoration: 'underline', fontFamily: PJS }}
                >
                  <ExternalLink size={12} /> Visit website
                </a>
              )}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#555', fontFamily: PJS }}
              >
                <MapPin size={12} /> View on Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Search state ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={{ marginBottom: 20, position: 'relative' }}>
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
              onClick={() => handleSelect(venue)}
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
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>
                  {venue.name}
                </p>
                <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                  {venue.address}{venue.city ? `, ${venue.city}` : ''}{venue.country ? `, ${venue.country}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {showResults && searchTerm.length >= 3 && results.length === 0 && !isSearching && (
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
