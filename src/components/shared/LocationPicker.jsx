import React, { useState, useRef, useEffect } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';

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

export default function LocationPicker({
  value,
  onChange,
  label,
  placeholder = 'Search for a venue or location...',
  dark = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const containerRef = useRef(null);
  const focused = useRef(false);

  useEffect(() => { loadGoogleMapsScript(); }, []);

  // Sync display value
  useEffect(() => {
    const display = typeof value === 'object'
      ? (value?.name || value?.fullAddress || '')
      : (value || '');
    setInputValue(display);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchNominatim = (query) => {
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`)
      .then(r => r.json())
      .then(results => {
        setLoading(false);
        if (!results.length) { setSuggestions([]); return; }
        setSuggestions(results.map(r => ({
          placeId: String(r.place_id),
          name: r.display_name.split(',')[0],
          address: r.display_name.split(',').slice(1, 3).join(',').trim(),
          fullText: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
        setOpen(true);
      })
      .catch(() => { setLoading(false); setSuggestions([]); });
  };

  const searchGoogle = (query) => {
    if (!window.google?.maps?.places) { searchNominatim(query); return; }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    const svc = new window.google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      { input: query, sessionToken: sessionTokenRef.current, types: ['establishment', 'geocode'] },
      (predictions, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.map(p => ({
            placeId: p.place_id,
            name: p.structured_formatting?.main_text || p.description,
            address: p.structured_formatting?.secondary_text || '',
            fullText: p.description,
          })));
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const searchPlaces = (query) => {
    if (!query || query.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    if (window.google?.maps?.places) {
      searchGoogle(query);
    } else {
      // Try Google after a short wait, then fall back
      setTimeout(() => {
        if (window.google?.maps?.places) searchGoogle(query);
        else searchNominatim(query);
      }, 600);
    }
  };

  const resolveGoogleDetails = (placeId, fallbackName, fallbackAddress, fallbackFullText) => {
    if (!window.google?.maps?.places) {
      onChange({ name: fallbackName, address: fallbackAddress, fullText: fallbackFullText });
      return;
    }
    const dummyDiv = document.createElement('div');
    const svc = new window.google.maps.places.PlacesService(dummyDiv);
    svc.getDetails(
      { placeId, fields: ['name', 'formatted_address', 'geometry', 'place_id'], sessionToken: sessionTokenRef.current },
      (place, status) => {
        sessionTokenRef.current = null;
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onChange({
            name: place.name,
            address: place.formatted_address,
            placeId: place.place_id,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
          });
        } else {
          onChange({ name: fallbackName, address: fallbackAddress, fullText: fallbackFullText });
        }
      }
    );
  };

  const handleSelect = (s) => {
    setInputValue(s.fullText || s.name);
    setSuggestions([]);
    setOpen(false);
    // If it's a Google Place ID (starts with Ch or similar), resolve details
    if (s.placeId && !String(s.placeId).match(/^\d+$/) && window.google?.maps?.places) {
      resolveGoogleDetails(s.placeId, s.name, s.address, s.fullText);
    } else {
      onChange({ name: s.name, address: s.address, fullText: s.fullText, lat: s.lat, lng: s.lng });
    }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (!val) { onChange(typeof value === 'object' ? null : ''); setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 350);
  };

  const borderColor = focused.current ? '#E03553' : (dark ? '#333333' : '#DDDDDD');
  const textColor = dark ? '#FFFFFF' : '#0A0A0A';

  return (
    <div ref={containerRef} style={{ position: 'relative', marginBottom: 16 }}>
      {label && (
          {label}
        </p>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', flexShrink: 0 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#AAAAAA" strokeWidth="1.8">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <input
          type="text"
          value={inputValue}
          onChange={handleInput}
          onFocus={(e) => {
            focused.current = true;
            e.target.style.borderBottomColor = '#E03553';
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={(e) => {
            focused.current = false;
            e.target.style.borderBottomColor = dark ? '#333333' : '#DDDDDD';
            setTimeout(() => setOpen(false), 200);
          }}
          placeholder={placeholder}
          style={{
            width: '100%', paddingLeft: 22, paddingBottom: 8, paddingTop: 4,
            border: 'none', borderBottom: `1px solid ${borderColor}`,
            background: 'transparent', fontSize: 14, outline: 'none',
            color: textColor, fontFamily: 'Plus Jakarta Sans, sans-serif',
            boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, border: '2px solid #EEEEEE', borderTop: '2px solid #E03553', borderRadius: '50%', animation: 'lp-spin 0.8s linear infinite', flexShrink: 0 }} />
        )}
        {inputValue && !loading && (
          <button
            onClick={() => { setInputValue(''); onChange(typeof value === 'object' ? null : ''); setSuggestions([]); setOpen(false); }}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA', fontSize: 18, padding: 0, lineHeight: 1 }}
          >×</button>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: '#FFFFFF', border: '1px solid #EEEEEE',
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden', marginTop: 4,
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s.placeId + i}
              onMouseDown={() => handleSelect(s)}
              style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '1px solid #F5F5F5' : 'none', display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFFFFF', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9F9F9'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}
            >
              <svg style={{ marginTop: 2, flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E03553" strokeWidth="2">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
                {s.address && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</p>}
              </div>
            </div>
          ))}
          <div style={{ padding: '6px 14px', background: '#F9F9F9', borderTop: '1px solid #EEEEEE' }}>
            <p style={{ margin: 0, fontSize: 10, color: '#AAAAAA' }}>Powered by Google Places</p>
          </div>
        </div>
      )}

      <style>{`@keyframes lp-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}