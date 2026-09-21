import React, { useEffect, useRef, useState } from 'react';
import { Search, Navigation, MapPin, X, Plus, Loader2 } from 'lucide-react';
import SmartImage from './SmartImage';
import PillButton from './PillButton';
import { TextField } from './Field';
import { useApi } from '../data/api';
import { openExternal } from '../native';

/**
 * The Google Places field, as src/components/shared/VenueSearchPanel.jsx
 * does it on desktop: type to search (POST /api/places-search through the
 * api seam, debounced 400ms), Use my location biases the search, results
 * carry Google's photo, Add manually takes a name and an address and builds
 * a Maps search link. The value is the desktop's venue shape:
 * `{ name, address, placeId, mapsUrl, photoUrl }` (plus `photoReference`
 * and `rating` when the caller asked for them). A chosen place renders as
 * a card with its photo, address and Open in Maps, which opens the native
 * Maps app through the system, never inside the webview.
 */
export default function PlaceField({ label = 'Venue', value, onChange, locationBias = '', placeholder = 'Search for a place', manualFields = null, extraFromPlace, queryPrefix = '' }) {
  const api = useApi();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [geo, setGeo] = useState('idle'); // idle | loading | active | error | unavailable
  const coords = useRef(null);
  const timer = useRef(null);
  const [manual, setManual] = useState(false);
  const [mName, setMName] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mError, setMError] = useState('');

  const search = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const body = { q: `${queryPrefix}${q.trim()}`, location: locationBias };
      if (coords.current) { body.lat = coords.current.lat; body.lng = coords.current.lng; }
      const places = await api.places.search(body);
      setResults(places || []);
      setOpen(true);
    } catch { setResults([]); setOpen(true); }
    setSearching(false);
  };
  const onQuery = (e) => { const v = e.target.value; setQuery(v); clearTimeout(timer.current); timer.current = setTimeout(() => search(v), 400); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const pick = (place) => {
    onChange({
      name: place.name,
      address: place.address || '',
      placeId: place.place_id,
      mapsUrl: place.maps_url,
      photoUrl: place.photo_reference ? api.places.photo(place.photo_reference) : null,
      photoReference: place.photo_reference || null,
      rating: place.rating ?? null,
      price_level: place.price_level ?? null,
      ...(extraFromPlace ? extraFromPlace(place) : {}),
    });
    setQuery(''); setResults([]); setOpen(false); setManual(false);
  };
  const saveManual = () => {
    if (!mName.trim()) { setMError('Add a name.'); return; }
    onChange({ name: mName.trim(), address: mAddress.trim(), placeId: null, mapsUrl: mAddress.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mAddress.trim())}` : null, photoUrl: null, photoReference: null, rating: null });
    setMName(''); setMAddress(''); setMError(''); setManual(false);
  };
  const useLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeo('unavailable'); return; }
    setGeo('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { coords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setGeo('active'); if (query.trim()) search(query); },
      () => setGeo('error'),
      { timeout: 8000, maximumAge: 300000 },
    );
  };

  if (value?.name && !manual) {
    return (
      <div className="oi-m-field">
        <span className="oi-m-field__label">{label}</span>
        <div className="oi-m-place">
          <SmartImage src={value.photoUrl || ''} alt={value.name} width={358} ratio="16/9" tone="neutral" />
          <div className="oi-m-place__body">
            <div className="oi-m-item__title" style={{ whiteSpace: 'normal' }}>{value.name}</div>
            {value.address && <div className="oi-m-meta">{value.address}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {value.mapsUrl && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={() => openExternal(value.mapsUrl)}>Open in Maps</PillButton>}
              <PillButton variant="ghost" size="sm" icon={X} onClick={() => onChange(null)}>Change</PillButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oi-m-field">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="oi-m-field__label">{label}</span>
        {geo === 'idle' && <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={useLocation}><Navigation size={13} /> Use my location</button>}
        {geo === 'loading' && <span className="oi-m-meta" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Loader2 size={13} className="oi-m-spin" /> Finding you</span>}
        {geo === 'active' && <span className="oi-m-meta" style={{ color: 'var(--m-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Navigation size={13} /> Near you <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 44 }} onClick={() => { coords.current = null; setGeo('idle'); }} aria-label="Stop using my location"><X size={13} /></button></span>}
        {geo === 'error' && <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 44 }} onClick={useLocation}>Could not find you. Try again</button>}
        {geo === 'unavailable' && <span className="oi-m-meta">Location is not available</span>}
      </div>
      {!manual ? (
        <>
          <div style={{ position: 'relative' }}>
            <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
            <input className="oi-m-input" style={{ paddingLeft: 42 }} value={query} onChange={onQuery} onFocus={() => results.length > 0 && setOpen(true)} placeholder={placeholder} autoCapitalize="words" />
            {searching && <Loader2 size={18} className="oi-m-spin" style={{ position: 'absolute', right: 14, top: 15, color: 'var(--m-primary)' }} />}
          </div>
          {open && (
            <div className="oi-m-card oi-m-card--flush" style={{ marginTop: 8 }}>
              {results.length === 0 ? <div className="oi-m-meta" style={{ padding: '12px 16px' }}>Nothing found. Try another name, or add it by hand.</div> : results.map((p) => (
                <button key={p.place_id} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => pick(p)}>
                  <SmartImage src={api.places.photo(p.photo_reference, 120) || ''} alt="" width={44} height={44} style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                  <div className="oi-m-row__body">
                    <div className="oi-m-row__label">{p.name}</div>
                    {p.address && <div className="oi-m-row__sub">{p.address}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <button type="button" className="oi-m-block__link" style={{ margin: '8px 0 0', minHeight: 44, alignSelf: 'flex-start' }} onClick={() => setManual(true)}>Add by hand</button>
        </>
      ) : (
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextField label="Name" value={mName} onChange={(e) => { setMName(e.target.value); setMError(''); }} error={mError} placeholder="The family farm, our backyard" autoCapitalize="words" />
          <TextField label="Address" value={mAddress} onChange={(e) => setMAddress(e.target.value)} placeholder="42 Main St, Sydney NSW 2000" />
          {manualFields}
          <div style={{ display: 'flex', gap: 8 }}>
            <PillButton variant="secondary" size="sm" onClick={() => setManual(false)}>Back to search</PillButton>
            <PillButton variant="primary" size="sm" icon={Plus} onClick={saveManual}>Set place</PillButton>
          </div>
        </div>
      )}
    </div>
  );
}
