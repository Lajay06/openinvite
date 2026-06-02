import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Plus, X, Search, ChevronDown, ChevronUp, Navigation, MapPin, ExternalLink, Trash2 } from "lucide-react";
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";
import DatePicker from "@/components/shared/DatePicker";
import ThemeSection from "@/components/event-details/ThemeSection";
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'events',  label: 'Events' },
  { key: 'theme',   label: 'Theme' },
];

const GUEST_TYPES = [
  { id: 'intimate',    label: 'Intimate',    range: 'Under 50', desc: 'Small and personal' },
  { id: 'celebration', label: 'Celebration', range: '50–150',   desc: 'The perfect balance' },
  { id: 'grand',       label: 'Grand',       range: '150+',     desc: 'Big and festive' },
];

const STYLE_GROUPS = [
  { label: 'Style', options: ['Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'] },
  { label: 'Cultural / religious', options: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Civil', 'Cultural Fusion', 'Non-religious'] },
  { label: 'Vibe', options: ['Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day', 'Elopement'] },
];

const PRE_WEDDING_TYPES  = ['Engagement Party', 'Bridal Shower', 'Bachelor Party', 'Bachelorette Party', 'Rehearsal Dinner', 'Welcome Cocktails', 'Other'];
const POST_WEDDING_TYPES = ['After Party', 'Next-Day Brunch', 'Farewell Brunch', 'Thank You Reception', 'Other'];

const DEFAULT_THEME = { vibes: [], season: '', setting: '', is_religious: false, religious_details: '', is_cultural: false, cultural_details: '' };

const sLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8, display: 'block' };
const divider = { height: 1, background: 'rgba(10,10,10,0.08)', margin: '28px 0' };

function photoProxy(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

// ── Shared field components ───────────────────────────────────────────────────

function UInput({ label, value, onChange, placeholder = '', type = 'text', half }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20, ...(half ? {} : {}) }}>
      {label && <span style={sLabel}>{label}</span>}
      <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`, background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
      />
    </div>
  );
}

function UTextarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <span style={sLabel}>{label}</span>}
      <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`, background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box', resize: 'vertical', display: 'block', lineHeight: 1.6 }}
      />
    </div>
  );
}

// ── Venue search panel ────────────────────────────────────────────────────────
// Same REST + "Add manually" + "Use my location" pattern as Accommodation page.

function VenueSearchPanel({ venue, onChange, locationBias = '' }) {
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
        <span style={sLabel}>Venue</span>
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
                style={{ fontSize: 11, fontWeight: 700, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                <ExternalLink size={10} /> Map
              </a>
            )}
            <button type="button" onClick={() => onChange(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0, display: 'flex', alignItems: 'center' }}>
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
        <span style={sLabel}>Venue</span>
        {geoState === 'idle' && (
          <button type="button" onClick={handleUseLocation}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, padding: 0 }}>
            <Navigation size={11} /> Use my location
          </button>
        )}
        {geoState === 'loading' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
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
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
            Couldn't get location —{' '}
            <button type="button" onClick={handleUseLocation} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: PJS, color: 'rgba(10,10,10,0.55)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>retry</button>
          </span>
        )}
        {geoState === 'unavailable' && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Location not available</span>}
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
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                  </div>
                </button>
              ))}
              <button onClick={() => setShowDropdown(false)}
                style={{ width: '100%', padding: '7px 12px', background: 'rgba(10,10,10,0.02)', border: 'none', borderTop: '1px solid rgba(10,10,10,0.06)', cursor: 'pointer', fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
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
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, letterSpacing: '0.06em' }}>Add venue manually</span>
            <button type="button" onClick={() => setShowManual(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, padding: 0, fontWeight: 600 }}>
              ← Back to search
            </button>
          </div>
          <UInput label="Venue name" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. The family farm, our backyard" />
          <UInput label="Address" value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="e.g. 42 Main St, Sydney NSW 2000" />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={handleManualSave} className="btn-primary" style={{ fontSize: 12, padding: '7px 18px' }}>
              <Plus size={13} /> Set venue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event accordion card ──────────────────────────────────────────────────────

function EventCard({ eventType, data, weddingDate, isPost, isExpanded, onToggle, onUpdate, onDelete, locationBias }) {
  const isFixed = eventType === 'ceremony' || eventType === 'reception';
  const title = eventType === 'ceremony' ? 'Ceremony' : eventType === 'reception' ? 'Reception' : (data.name || 'Untitled event');

  // Venue object — shape is consistent for all event types
  const venue = data.venueName
    ? { name: data.venueName, address: data.venueAddress || data.address || '', mapsUrl: data.venueMapsUrl || data.mapsUrl || null, photoUrl: data.venuePhotoUrl || data.photoUrl || null, placeId: data.venuePlaceId || data.placeId || null }
    : null;

  const startTime = data.startTime || data.time || '';
  const endTime   = data.endTime || '';
  const eventDate = isFixed ? weddingDate : data.date;

  const timeStr = [fmtTime(startTime), endTime && fmtTime(endTime)].filter(Boolean).join(' – ');
  const dateStr = fmtDate(eventDate);
  const summaryParts = [dateStr, timeStr, venue?.name].filter(Boolean);

  const handleVenueChange = (v) => {
    if (isFixed) {
      // ceremony/reception — write directly to the flat mainCeremony/reception fields
      onUpdate({
        venueName: v?.name  || '',
        address:   v?.address || '',
        mapsUrl:   v?.mapsUrl || null,
        photoUrl:  v?.photoUrl || null,
        placeId:   v?.placeId || null,
      });
    } else {
      // custom event — prefix venue fields to avoid collision with legacy 'address' field
      onUpdate({
        venueName:    v?.name    || '',
        venueAddress: v?.address  || '',
        venueMapsUrl: v?.mapsUrl  || null,
        venuePhotoUrl:v?.photoUrl || null,
        venuePlaceId: v?.placeId  || null,
        // keep legacy field in sync for any existing guest-site readers
        venue:   v?.name    || '',
        address: v?.address || '',
      });
    }
  };

  const typeBadge = isFixed
    ? null
    : (data.type || (isPost ? 'Post-wedding' : 'Pre-wedding'));

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, overflow: 'visible', marginBottom: 10, background: '#FFF' }}>
      {/* Collapsed header */}
      <button type="button" onClick={onToggle}
        style={{ width: '100%', display: 'flex', gap: 14, padding: '16px 20px', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: isExpanded ? '8px 8px 0 0' : 8 }}>
        {venue?.photoUrl ? (
          <img src={venue.photoUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={18} color="rgba(10,10,10,0.2)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>{title}</p>
            {typeBadge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.45)', fontFamily: PJS, flexShrink: 0 }}>
                {typeBadge}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summaryParts.join(' · ') || 'Tap to add details'}
          </p>
        </div>
        <div style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ padding: '20px 24px 24px', borderTop: '1px solid rgba(10,10,10,0.06)' }}>

          {/* Custom event meta (name + type + date) */}
          {!isFixed && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <UInput label="Event name" value={data.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="e.g. Welcome dinner" />
                <div style={{ marginBottom: 20 }}>
                  <span style={sLabel}>Type</span>
                  <select value={data.type || ''} onChange={e => onUpdate({ type: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, cursor: 'pointer' }}>
                    {(isPost ? POST_WEDDING_TYPES : PRE_WEDDING_TYPES).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={sLabel}>Date</span>
                <DatePicker value={data.date} onChange={v => onUpdate({ date: v })} placeholder="Select event date" />
              </div>
              <div style={divider} />
            </>
          )}

          {/* Venue */}
          <VenueSearchPanel
            venue={venue}
            onChange={handleVenueChange}
            locationBias={locationBias}
          />

          {/* Timing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <UInput label="Start time" type="time" value={startTime}
              onChange={e => onUpdate(isFixed ? { startTime: e.target.value } : { startTime: e.target.value, time: e.target.value })} />
            <UInput label="End time" type="time" value={endTime}
              onChange={e => onUpdate({ endTime: e.target.value })} />
          </div>

          {/* Details fields */}
          <div style={{ ...divider, margin: '8px 0 20px' }} />
          <UInput label="Dress code" value={data.dressCode}
            onChange={e => onUpdate({ dressCode: e.target.value })} placeholder="e.g. Black tie, smart casual" />
          <UInput label="Parking info" value={data.parkingInfo}
            onChange={e => onUpdate({ parkingInfo: e.target.value })} placeholder="e.g. Free parking on Church St" />
          <UInput label="Accessibility notes" value={data.accessibilityNotes}
            onChange={e => onUpdate({ accessibilityNotes: e.target.value })} placeholder="e.g. Wheelchair accessible via north entrance" />
          <UTextarea label="Notes" rows={3}
            value={isFixed ? (data.notes || '') : (data.details || data.notes || '')}
            onChange={e => onUpdate(isFixed ? { notes: e.target.value } : { details: e.target.value, notes: e.target.value })}
            placeholder="e.g. Outdoor setting — dress for warm weather, ceremony runs ~40 minutes" />

          {/* Delete — only for custom events */}
          {!isFixed && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" onClick={onDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontWeight: 600, padding: 0 }}>
                <Trash2 size={13} /> Remove event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add event inline form ─────────────────────────────────────────────────────

function AddEventForm({ onAdd, onCancel }) {
  const [kind, setKind] = useState('pre');
  const [eventType, setEventType] = useState(PRE_WEDDING_TYPES[0]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const types = kind === 'pre' ? PRE_WEDDING_TYPES : POST_WEDDING_TYPES;

  const handleKindChange = (k) => {
    setKind(k);
    setEventType(k === 'pre' ? PRE_WEDDING_TYPES[0] : POST_WEDDING_TYPES[0]);
  };

  const handleCreate = () => {
    onAdd({
      id: uid(),
      name: name.trim() || eventType,
      type: eventType,
      date: date || '',
      startTime: '', endTime: '',
      venueName: '', venueAddress: '', venueMapsUrl: null, venuePhotoUrl: null, venuePlaceId: null,
      dressCode: '', parkingInfo: '', accessibilityNotes: '', details: '',
      // legacy compat fields
      time: '', venue: '', address: '', notes: '',
      isCustomType: false,
    }, kind);
  };

  return (
    <div style={{ border: '1px solid rgba(224,53,83,0.2)', borderRadius: 8, padding: '20px 24px', marginBottom: 10, background: 'rgba(224,53,83,0.02)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px' }}>New event</p>

      {/* Pre / Post toggle */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, overflow: 'hidden', marginBottom: 18, width: 'fit-content' }}>
        {[['pre', 'Pre-wedding'], ['post', 'Post-wedding']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => handleKindChange(k)}
            style={{ padding: '7px 18px', background: kind === k ? '#0A0A0A' : '#FFF', color: kind === k ? '#FFF' : 'rgba(10,10,10,0.55)', border: 'none', borderRight: k === 'pre' ? '1px solid rgba(10,10,10,0.12)' : 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: PJS, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <UInput label="Event name" value={name} onChange={e => setName(e.target.value)} placeholder={eventType} />
        <div style={{ marginBottom: 20 }}>
          <span style={sLabel}>Type</span>
          <select value={eventType} onChange={e => setEventType(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, cursor: 'pointer' }}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={sLabel}>Date</span>
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, padding: '7px 16px' }}>
          Cancel
        </button>
        <button type="button" onClick={handleCreate} className="btn-primary" style={{ fontSize: 12, padding: '7px 18px' }}>
          <Plus size={13} /> Create event
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventDetailsPage() {
  const [tab, setTab] = useState('details');
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveRef = useRef(null);
  const latestRef  = useRef(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      const r = rows[0] || {};
      setRecord(r);
      setRecordId(r.id || null);
      latestRef.current = r;
      setLoading(false);

      // One-time promotion: copy attire.dressCode → mainCeremony.dressCode if canonical is empty
      if (r.id && !r.mainCeremony?.dressCode && r.attire?.dressCode) {
        const promoted = { ...r, mainCeremony: { ...(r.mainCeremony || {}), dressCode: r.attire.dressCode } };
        base44.entities.WeddingDetails.update(r.id, { mainCeremony: promoted.mainCeremony })
          .catch(e => console.warn('Dress code promotion failed:', e));
        setRecord(promoted);
        latestRef.current = promoted;
      }
    }).catch(() => setLoading(false));
  }, []);

  const update = (patch) => {
    setRecord(prev => {
      const next = { ...prev, ...patch };
      latestRef.current = next;
      return next;
    });
    triggerAutoSave();
  };

  const updateNested = (key, patch) => {
    setRecord(prev => {
      const next = { ...prev, [key]: { ...(prev?.[key] || {}), ...patch } };
      latestRef.current = next;
      return next;
    });
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      const data = latestRef.current;
      try {
        if (recordId) {
          await base44.entities.WeddingDetails.update(recordId, data);
        } else {
          const created = await base44.entities.WeddingDetails.create(data);
          setRecordId(created.id);
        }
        setSaveStatus('saved');
        window.dispatchEvent(new CustomEvent('weddingDetailsSaved'));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 1500);
  };

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddEvent = (newEvent, kind) => {
    if (kind === 'pre') {
      update({ preWeddingEvents:  [...((record?.preWeddingEvents  || [])), newEvent] });
    } else {
      update({ postWeddingEvents: [...((record?.postWeddingEvents || [])), newEvent] });
    }
    setShowAddForm(false);
    setExpandedIds(prev => new Set([...prev, newEvent.id]));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const r      = record || {};
  const mc     = r.mainCeremony || {};
  const rc     = r.reception    || {};
  const styles = r.weddingStyle || [];
  const theme  = { ...DEFAULT_THEME, ...(r.theme || {}) };
  const locationBias = mc.address || '';

  const toggleStyle = (s) => {
    const arr = r.weddingStyle || [];
    update({ weddingStyle: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };

  const preEvents  = r.preWeddingEvents  || [];
  const postEvents = r.postWeddingEvents || [];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Event details" subtitle="Manage your wedding event information" />

      {/* Ava + save status bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help plan your event details" />
        <div className="flex items-center gap-[10px]">
          {saveStatus === 'saving' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22C55E', fontWeight: 600, fontFamily: PJS }}>
              <Check size={13} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)', borderBottom: tab === t.key ? '2px solid #0A0A0A' : '2px solid transparent', fontFamily: PJS, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details tab ──────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div style={{ padding: '32px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS, textAlign: 'center' }}>Couple</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <UInput label="Partner 1 name" value={r.couple1Name} onChange={e => update({ couple1Name: e.target.value })} placeholder="e.g. Sophie" />
            <UInput label="Partner 2 name" value={r.couple2Name} onChange={e => update({ couple2Name: e.target.value })} placeholder="e.g. James" />
          </div>

          <div style={divider} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>The date</p>
          <span style={sLabel}>Wedding date</span>
          <DatePicker value={r.weddingDate} onChange={v => update({ weddingDate: v })} placeholder="Select your wedding date" />

          <div style={divider} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>Guest count</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {GUEST_TYPES.map(g => {
              const sel = r.guestType === g.id;
              return (
                <div key={g.id} onClick={() => update({ guestType: sel ? '' : g.id })}
                  style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 12px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#E03553' : '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{g.label}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: sel ? '#E03553' : 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS }}>{g.range}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>{g.desc}</p>
                </div>
              );
            })}
          </div>
          <UInput label="Exact guest count" type="number" value={r.guestCount} onChange={e => update({ guestCount: e.target.value })} placeholder="e.g. 120" />

          <div style={divider} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>Wedding style</p>
          {STYLE_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 20 }}>
              <div style={{ ...sLabel, marginBottom: 10 }}>{group.label}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {group.options.map(s => {
                  const sel = styles.includes(s);
                  return (
                    <button key={s} onClick={() => toggleStyle(s)}
                      style={{ padding: '6px 14px', borderRadius: 999, border: `1px solid ${sel ? '#0A0A0A' : 'rgba(10,10,10,0.18)'}`, background: sel ? '#0A0A0A' : 'transparent', color: sel ? '#FFFFFF' : '#0A0A0A', fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Events tab ───────────────────────────────────────────────────────── */}
      {tab === 'events' && (
        <div style={{ padding: '32px 32px 80px' }}>
          {/* Ceremony (fixed) */}
          <EventCard
            eventType="ceremony"
            data={mc}
            weddingDate={r.weddingDate}
            isExpanded={expandedIds.has('ceremony')}
            onToggle={() => toggleExpanded('ceremony')}
            onUpdate={patch => updateNested('mainCeremony', patch)}
            locationBias={locationBias}
          />

          {/* Reception (fixed) */}
          <EventCard
            eventType="reception"
            data={rc}
            weddingDate={r.weddingDate}
            isExpanded={expandedIds.has('reception')}
            onToggle={() => toggleExpanded('reception')}
            onUpdate={patch => updateNested('reception', patch)}
            locationBias={locationBias}
          />

          {/* Pre-wedding custom events */}
          {preEvents.map(ev => (
            <EventCard
              key={ev.id}
              eventType="custom"
              data={ev}
              weddingDate={r.weddingDate}
              isPost={false}
              isExpanded={expandedIds.has(ev.id)}
              onToggle={() => toggleExpanded(ev.id)}
              onUpdate={patch => {
                const next = preEvents.map(e => e.id === ev.id ? { ...e, ...patch } : e);
                update({ preWeddingEvents: next });
              }}
              onDelete={() => update({ preWeddingEvents: preEvents.filter(e => e.id !== ev.id) })}
              locationBias={locationBias}
            />
          ))}

          {/* Post-wedding custom events */}
          {postEvents.map(ev => (
            <EventCard
              key={ev.id}
              eventType="custom"
              data={ev}
              weddingDate={r.weddingDate}
              isPost={true}
              isExpanded={expandedIds.has(ev.id)}
              onToggle={() => toggleExpanded(ev.id)}
              onUpdate={patch => {
                const next = postEvents.map(e => e.id === ev.id ? { ...e, ...patch } : e);
                update({ postWeddingEvents: next });
              }}
              onDelete={() => update({ postWeddingEvents: postEvents.filter(e => e.id !== ev.id) })}
              locationBias={locationBias}
            />
          ))}

          {/* Add event form or button */}
          {showAddForm ? (
            <AddEventForm onAdd={handleAddEvent} onCancel={() => setShowAddForm(false)} />
          ) : (
            <button type="button" onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', border: '1px dashed rgba(10,10,10,0.18)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, width: '100%', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.18)'; e.currentTarget.style.color = 'rgba(10,10,10,0.45)'; }}>
              <Plus size={16} /> Add event
            </button>
          )}
        </div>
      )}

      {/* ── Theme tab ────────────────────────────────────────────────────────── */}
      {tab === 'theme' && (
        <div style={{ padding: '32px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
          <ThemeSection
            theme={theme}
            onThemeChange={(key, value) => updateNested('theme', { [key]: value })}
            onSave={triggerAutoSave}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
