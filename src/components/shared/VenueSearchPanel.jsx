import React, { useState, useRef } from 'react';
import { Loader2, X, Search, Navigation, MapPin, ExternalLink, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

function photoProxy(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function FieldInput({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 6, display: 'block' }}>
          {label}
        </span>
      )}
      <input
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box' }}
      />
    </div>
  );
}

const sLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 8, display: 'block' };

/**
 * Shared Places-powered venue search panel.
 * Calls /api/places-search (server-side proxy — no client-side key).
 *
 * Props:
 *   venue        — current value: null | { name, address, placeId, mapsUrl, photoUrl }
 *   onChange(v)  — called with a venue object on selection, or null on clear
 *   locationBias — optional city/address string to bias search results
 *   label        — field label (default: 'Venue')
 */
export default function VenueSearchPanel({ venue, onChange, locationBias = '', label = 'Venue' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoState, setGeoState] = useState('idle'); // idle | loading | active | error | unavailable
  const geoCoordsRef = useRef(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const body = { q: q.trim(), location: locationBias };
      if (geoCoordsRef.current) { body.lat = geoCoordsRef.current.lat; body.lng = geoCoordsRef.current.lng; }
      const res = await fetch('/api/places-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResults(data.places || []);
      setShowDropdown(true);
    } catch { toast.error('Search failed'); }
    setSearching(false);
  };

  const handleQueryChange = e => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSelect = (place) => {
    onChange({
      name: place.name,
      address: place.address || '',
      placeId: place.place_id,
      mapsUrl: place.maps_url,
      photoUrl: place.photo_reference ? photoProxy(place.photo_reference) : null,
    });
    setQuery(''); setResults([]); setShowDropdown(false); setShowManual(false);
  };

  const handleManualSave = () => {
    if (!manualName.trim()) { toast.error('Venue name is required'); return; }
    onChange({
      name: manualName.trim(),
      address: manualAddress.trim(),
      placeId: null,
      mapsUrl: manualAddress.trim()
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualAddress.trim())}`
        : null,
      photoUrl: null,
    });
    setManualName(''); setManualAddress(''); setShowManual(false);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) { setGeoState('unavailable'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { geoCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setGeoState('active'); },
      err => { console.warn('[Geo]', err.message); setGeoState('error'); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const clearGeo = () => { geoCoordsRef.current = null; setGeoState('idle'); };

  // Venue already set — show chip with change option
  if (venue?.name && !showDropdown && !showManual) {
    return (
      <div style={{ marginBottom: 20 }}>
        <span style={sLabel}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, background: '#FAFAFA' }}>
          {venue.photoUrl ? (
            <img src={venue.photoUrl} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{ width: 52, height: 52, background: 'rgba(10,10,10,0.05)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={20} color="rgba(10,10,10,0.2)" />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{venue.name}</p>
            {venue.address && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>{venue.address}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
            {venue.mapsUrl && (
              <a href={venue.mapsUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                <ExternalLink size={10} /> Map
              </a>
            )}
            <button type="button" onClick={() => onChange(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 0, display: 'flex', alignItems: 'center' }}>
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={sLabel}>{label}</span>
        {geoState === 'idle' && (
          <button type="button" onClick={handleUseLocation}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: 0 }}>
            <Navigation size={11} /> Use my location
          </button>
        )}
        {geoState === 'loading' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            <Loader2 size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> Getting location…
          </span>
        )}
        {geoState === 'active' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#E03553', fontFamily: PJS }}>
            <Navigation size={11} /> Using your location
            <button type="button" onClick={clearGeo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
          </span>
        )}
        {geoState === 'error' && (
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            Couldn't get location —{' '}
            <button type="button" onClick={handleUseLocation} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: PJS, color: 'rgba(10,10,10,0.55)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>retry</button>
          </span>
        )}
        {geoState === 'unavailable' && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Location not available</span>}
      </div>

      {!showManual ? (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
            <Input value={query} onChange={handleQueryChange} onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="Search for a venue…" style={{ paddingLeft: 20 }} />
            {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {showDropdown && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#FFF', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: 260, overflowY: 'auto' }}>
              {results.map((place, i) => (
                <button key={place.place_id} onClick={() => handleSelect(place)}
                  style={{ width: '100%', display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'center', background: '#FFF', border: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFF'; }}
                >
                  {place.photo_reference ? (
                    <img src={photoProxy(place.photo_reference, 60)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={12} color="rgba(10,10,10,0.2)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', fontFamily: PJS }}>{place.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                  </div>
                </button>
              ))}
              <button onClick={() => setShowDropdown(false)}
                style={{ width: '100%', padding: '7px 12px', background: 'rgba(10,10,10,0.02)', border: 'none', borderTop: '1px solid rgba(10,10,10,0.06)', cursor: 'pointer', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                Close
              </button>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={() => setShowManual(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, padding: 0, fontWeight: 600 }}>
              Add manually
            </button>
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, letterSpacing: '0.06em' }}>Add venue manually</span>
            <button type="button" onClick={() => setShowManual(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, padding: 0, fontWeight: 600 }}>
              ← Back to search
            </button>
          </div>
          <FieldInput label="Venue name" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. The family farm, our backyard" />
          <FieldInput label="Address" value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="e.g. 42 Main St, Sydney NSW 2000" />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleManualSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0A0A0A', color: '#FFF', border: 'none', borderRadius: 999, cursor: 'pointer', fontSize: 12, padding: '7px 18px', fontFamily: PJS, fontWeight: 600 }}>
              <Plus size={13} /> Set venue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
