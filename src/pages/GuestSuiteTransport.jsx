import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { Loader2, Car, MapPin, Star, ExternalLink, X, Search, Plus, Plane, Train, Bus, FileText, Navigation } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TRANSPORT_TYPES = [
  { key: 'airport',       label: 'Airport',          icon: Plane },
  { key: 'train_station', label: 'Train station',     icon: Train },
  { key: 'bus_station',   label: 'Bus/coach station', icon: Bus },
  { key: 'car_rental',    label: 'Car rental',        icon: Car },
  { key: 'ferry',         label: 'Ferry terminal',    icon: MapPin },
  { key: 'other',         label: 'Other',             icon: MapPin },
];

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 8, display: 'block',
};

function photoProxy(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function TransportIcon({ type, size = 18 }) {
  const cfg = TRANSPORT_TYPES.find(t => t.key === type);
  const Icon = cfg?.icon || MapPin;
  return <Icon size={size} color="rgba(10,10,10,0.45)" strokeWidth={1.8} />;
}

// ── Place card ────────────────────────────────────────────────────────────────

function TransportPlaceCard({ place, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const typeLabel = TRANSPORT_TYPES.find(t => t.key === place.type)?.label || 'Transport';
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FFFFFF', position: 'relative' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ height: 140, background: '#F5F5F5', position: 'relative', overflow: 'hidden' }}>
        {place.photo_url ? (
          <img src={place.photo_url} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TransportIcon type={place.type} size={28} />
          </div>
        )}
        <span style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#FFF', fontFamily: PJS }}>
          {typeLabel}
        </span>
        {hovered && onRemove && (
          <button onClick={onRemove} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={13} color="#FFF" />
          </button>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS }}>{place.name}</p>
        {place.address && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '0 0 6px', fontFamily: PJS }}>{place.address}</p>}
        {place.note && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: '0 0 6px', fontFamily: PJS, fontStyle: 'italic' }}>"{place.note}"</p>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {place.maps_url && (
            <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}>
              <ExternalLink size={10} /> View on maps
            </a>
          )}
          {place.website_url && (
            <a href={place.website_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}>
              <ExternalLink size={10} /> Website / link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '14px 16px', background: '#FFFFFF', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <FileText size={14} color="rgba(10,10,10,0.35)" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} rows={2}
              style={{ flex: 1, border: '1px solid rgba(10,10,10,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 13, fontFamily: PJS, resize: 'vertical', outline: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => { onEdit(draft); setEditing(false); }} className="btn-primary" style={{ fontSize: 11, padding: '4px 10px' }}>Save</button>
              <button onClick={() => { setDraft(note); setEditing(false); }} className="btn-editorial-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {note.title && <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 3px', letterSpacing: '0.05em' }}>{note.title}</p>}
            <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>{note.text}</p>
          </>
        )}
      </div>
      {!editing && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: 0 }}>Edit</button>
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 0 }}><X size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GuestSuiteTransport() {
  const [details, setDetails] = useState(null);
  const [places, setPlaces] = useState([]);
  const [notes, setNotes]   = useState([]);
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaSuggestions, setAvaSuggestions] = useState([]);
  const [avaLoading, setAvaLoading] = useState(false);

  // Google search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeType, setPlaceType] = useState('airport');
  const [placeNote, setPlaceNote] = useState('');
  const debounceRef = useRef(null);

  // Geolocation — transient bias only, never persisted
  const [geoState, setGeoState] = useState('idle'); // idle | loading | active | error | unavailable
  const geoCoordsRef = useRef(null);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState('other');
  const [manualNote, setManualNote] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  // Note add state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    getMyWeddingDetails()
      .then(d => {
        setDetails(d);
        setDetailsId(d?.id || null);
        setPlaces(d?.guestSuiteTransport?.places || []);
        setNotes(d?.guestSuiteTransport?.notes   || []);
      })
      .catch(e => console.error('GuestSuiteTransport load error', e))
      .finally(() => setLoading(false));
  }, []);

  const destination = details?.mainCeremony?.address || '';

  const saveData = async (nextPlaces, nextNotes) => {
    if (!detailsId) { toast.error('No wedding details found'); return; }
    setSaving(true);
    try {
      await base44.entities.WeddingDetails.update(detailsId, {
        guestSuiteTransport: { places: nextPlaces, notes: nextNotes },
      });
      toast.success('Saved');
    } catch (err) {
      console.error('GuestSuiteTransport save error:', err);
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  // Place search
  const searchPlaces = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const body = { q: q.trim(), location: destination || '' };
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
    setSelectedPlace(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(v), 400);
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setQuery(place.name);
    setShowDropdown(false);
    setResults([]);
    setShowManual(false);
  };

  const handleAddPlace = () => {
    if (!selectedPlace) { toast.error('Select a place first'); return; }
    const newPlace = {
      id: uid(), place_id: selectedPlace.place_id, name: selectedPlace.name,
      address: selectedPlace.address, type: placeType,
      photo_url: selectedPlace.photo_reference ? photoProxy(selectedPlace.photo_reference) : null,
      maps_url: selectedPlace.maps_url, note: placeNote.trim(),
    };
    const next = [...places, newPlace];
    setPlaces(next);
    saveData(next, notes);
    setSelectedPlace(null); setQuery(''); setPlaceNote('');
  };

  const handleManualAddPlace = () => {
    if (!manualName.trim()) { toast.error('Name is required'); return; }
    const newPlace = {
      id: uid(), name: manualName.trim(), type: manualType,
      address: '', photo_url: null,
      maps_url: null,
      website_url: manualUrl.trim() || null,
      note: manualNote.trim(),
    };
    const next = [...places, newPlace];
    setPlaces(next);
    saveData(next, notes);
    setManualName(''); setManualType('other'); setManualNote(''); setManualUrl('');
    setShowManual(false);
  };

  const handleRemovePlace = (id) => {
    const next = places.filter(p => p.id !== id);
    setPlaces(next);
    saveData(next, notes);
  };

  const handleAddNote = () => {
    if (!noteText.trim()) { toast.error('Enter a note'); return; }
    const next = [...notes, { id: uid(), title: noteTitle.trim(), text: noteText.trim() }];
    setNotes(next);
    saveData(places, next);
    setNoteTitle(''); setNoteText('');
  };

  const handleRemoveNote = (id) => {
    const next = notes.filter(n => n.id !== id);
    setNotes(next);
    saveData(places, next);
  };

  const handleEditNote = (id, updated) => {
    const next = notes.map(n => n.id === id ? { ...n, ...updated } : n);
    setNotes(next);
    saveData(places, next);
  };

  // Geolocation
  const handleUseLocation = () => {
    if (!navigator.geolocation) { setGeoState('unavailable'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        geoCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoState('active');
      },
      err => { console.warn('[Geolocation]', err.message); setGeoState('error'); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const clearGeo = () => { geoCoordsRef.current = null; setGeoState('idle'); };

  const handleAvaRecommend = async () => {
    if (!destination) { toast.error('Add your venue address in Event Details first'); return; }
    setAvaLoading(true);
    try {
      const prompt = `Give transport advice for wedding guests getting to and around ${destination}. Cover: nearest airport(s), how to get from airport to venue area, public transport, rideshare/taxi tips, parking, and any wedding-day transport note.

Return ONLY valid JSON, no markdown:
{"suggestions":[
  {"type":"airport","name":"Exact airport name","description":"1-2 sentences: distance, transport options to venue area","isPlace":true},
  {"type":"rideshare","name":"Rideshare & taxi","description":"Rideshare availability, estimated fare, pickup tips","isPlace":false},
  {"type":"public_transport","name":"Public transport","description":"Best public transport routes to the venue area","isPlace":false},
  {"type":"parking","name":"Parking","description":"Venue parking availability and nearby options","isPlace":false},
  {"type":"tip","name":"Wedding day shuttle","description":"Recommend couples arrange a shuttle if venue is remote","isPlace":false}
]}

Type options: "airport", "train_station", "rideshare", "public_transport", "parking", "tip"
isPlace: true only for actual places (airports, stations) that can be found on Google Maps`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions = (parsed.suggestions || []).map((s, i) => ({ ...s, _avaId: `ava-${i}-${Date.now()}` }));
      setAvaSuggestions(suggestions);
    } catch { toast.error('Ava couldn\'t generate suggestions — try again'); }
    setAvaLoading(false);
  };

  const handleAddAvaPlace = async (suggestion) => {
    const loc = destination || '';
    let place = {
      id: uid(), name: suggestion.name, type: suggestion.type === 'airport' ? 'airport' : suggestion.type === 'train_station' ? 'train_station' : 'other',
      note: suggestion.description || '', photo_url: null, maps_url: null, address: '',
    };
    try {
      const res = await fetch('/api/places-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: suggestion.name, location: loc }),
      });
      const data = await res.json();
      const top = data.places?.[0];
      if (top) {
        place = { ...place, place_id: top.place_id, address: top.address, photo_url: top.photo_reference ? photoProxy(top.photo_reference) : null, maps_url: top.maps_url };
      }
    } catch {}
    const next = [...places, place];
    setPlaces(next);
    saveData(next, notes);
    setAvaSuggestions(prev => prev.filter(s => s._avaId !== suggestion._avaId));
    toast.success(`${suggestion.name} added`);
  };

  const handleAddAvaNote = (suggestion) => {
    const next = [...notes, { id: uid(), title: suggestion.name, text: suggestion.description }];
    setNotes(next);
    saveData(places, next);
    setAvaSuggestions(prev => prev.filter(s => s._avaId !== suggestion._avaId));
    toast.success('Note added');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Transport"
        subtitle="Getting to and around the venue"
        actions={saving ? <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Saving…</span> : null}
      />

      <div style={{ padding: '32px 32px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'rgba(10,10,10,0.3)' }} />
          </div>
        ) : (
          <>
            {/* Ava button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              {avaLoading ? (
                <button disabled style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '7px 14px', background: 'linear-gradient(135deg, #ec4899, #9333ea)', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: PJS, border: 'none', opacity: 0.7 }}>
                  <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Ava is thinking…
                </button>
              ) : (
                <AvaButton label="Ask Ava for transport recommendations" onClick={handleAvaRecommend} />
              )}
            </div>

            {/* Ava suggestions */}
            {avaSuggestions.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
                  Ava's suggestions — add what's relevant
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {avaSuggestions.map(s => (
                    <div key={s._avaId} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '14px 16px', background: '#FAFAFA', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <TransportIcon type={s.type} size={15} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 3px', fontFamily: PJS }}>{s.name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: 0, fontFamily: PJS, lineHeight: 1.5 }}>{s.description}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {s.isPlace ? (
                          <button onClick={() => handleAddAvaPlace(s)} className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                            <Plus size={11} /> Add place
                          </button>
                        ) : (
                          <button onClick={() => handleAddAvaNote(s)} className="btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}>
                            <Plus size={11} /> Add note
                          </button>
                        )}
                        <button onClick={() => setAvaSuggestions(prev => prev.filter(x => x._avaId !== s._avaId))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 0 }}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add a place panel */}
            <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, padding: '20px 24px', marginBottom: 32 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px' }}>Add a transport location</p>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Search Google Places</span>
                  {/* Geolocation control */}
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
                      <button type="button" onClick={clearGeo}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {geoState === 'error' && (
                    <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                      Couldn't get location —{' '}
                      <button type="button" onClick={handleUseLocation}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: PJS, color: 'rgba(10,10,10,0.55)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>retry</button>
                    </span>
                  )}
                  {geoState === 'unavailable' && (
                    <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Location not available</span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                  <Input value={query} onChange={handleQueryChange} onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder="e.g. Sydney Airport, Central Station…" style={{ paddingLeft: 20 }} />
                  {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
                  {selectedPlace && !searching && (
                    <button type="button" onClick={() => { setSelectedPlace(null); setQuery(''); setPlaceNote(''); }} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

                {showDropdown && results.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFF', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: 280, overflowY: 'auto' }}>
                    {results.map((place, i) => (
                      <button key={place.place_id} onClick={() => handleSelectPlace(place)}
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
                  </div>
                )}
              </div>

              {/* Add manually toggle — hidden while a place is selected */}
              {!selectedPlace && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" onClick={() => setShowManual(m => !m)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, padding: 0, fontWeight: 600 }}>
                    {showManual ? '← Back to search' : 'Add manually'}
                  </button>
                </div>
              )}

              {/* Manual entry form */}
              {!selectedPlace && showManual && (
                <div style={{ marginTop: 14, border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, padding: '16px 16px 18px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 14px' }}>Add manually</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', marginBottom: 14 }}>
                    <div>
                      <label style={sectionLabel}>Name</label>
                      <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. Wedding shuttle — Crown Casino" />
                    </div>
                    <div>
                      <label style={sectionLabel}>Type</label>
                      <select value={manualType} onChange={e => setManualType(e.target.value)}
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', outline: 'none', cursor: 'pointer' }}>
                        {TRANSPORT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={sectionLabel}>Link <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                      <Input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://…" />
                    </div>
                    <div>
                      <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                      <Input value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="e.g. Departs Crown 4 pm sharp" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={handleManualAddPlace} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                      <Plus size={14} /> Add location
                    </button>
                  </div>
                </div>
              )}

              {/* Selected place — type/note/confirm all in one connected panel */}
              {selectedPlace && (
                <div style={{ marginTop: 16, border: '1px solid rgba(224,53,83,0.18)', borderRadius: 6, overflow: 'hidden' }}>
                  {/* Place header row */}
                  <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.1)' }}>
                    {selectedPlace.photo_reference ? (
                      <img src={photoProxy(selectedPlace.photo_reference, 80)} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={16} color="rgba(10,10,10,0.2)" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{selectedPlace.name}</p>
                      {selectedPlace.address && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPlace.address}</p>}
                    </div>
                    <button type="button" onClick={() => { setSelectedPlace(null); setQuery(''); setPlaceNote(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Type + note + confirm */}
                  <div style={{ padding: '14px 14px 16px', background: '#FFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0 24px', marginBottom: 16 }}>
                      <div>
                        <label style={sectionLabel}>Type</label>
                        <select value={placeType} onChange={e => setPlaceType(e.target.value)}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', outline: 'none', cursor: 'pointer' }}>
                          {TRANSPORT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                        <Input value={placeNote} onChange={e => setPlaceNote(e.target.value)} placeholder="e.g. ~20 min to venue by taxi…" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="button" onClick={handleAddPlace} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                        <Plus size={14} /> Add location
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Saved places */}
            {places.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
                  Getting here — {places.length} location{places.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {places.map(p => <TransportPlaceCard key={p.id} place={p} onRemove={() => handleRemovePlace(p.id)} />)}
                </div>
              </div>
            )}

            {/* Transport notes */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
                Transport tips & notes
              </p>

              {notes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {notes.map(n => (
                    <NoteCard key={n.id} note={n}
                      onRemove={() => handleRemoveNote(n.id)}
                      onEdit={(updated) => handleEditNote(n.id, updated)}
                    />
                  ))}
                </div>
              )}

              {/* Add note inline */}
              <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '0 12px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={sectionLabel}>Title <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                    <Input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="e.g. Rideshare" />
                  </div>
                  <div>
                    <label style={sectionLabel}>Note</label>
                    <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="e.g. Uber works well here — pick up on the south side of the venue" />
                  </div>
                  <button onClick={handleAddNote} className="btn-primary" style={{ fontSize: 12, padding: '8px 16px' }}>
                    <Plus size={13} /> Add
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
