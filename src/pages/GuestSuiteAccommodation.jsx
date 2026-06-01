import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Hotel, MapPin, Star, ExternalLink, X, Search, Plus } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const BADGE_OPTIONS = ['Closest to venue', 'Best value', 'Where most guests are staying', 'Luxury pick', 'Budget friendly'];

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8, display: 'block',
};

function photoProxy(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ── Saved place card ──────────────────────────────────────────────────────────

function PlaceCard({ place, onRemove }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FFFFFF', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ height: 170, background: '#F5F5F5', position: 'relative', overflow: 'hidden' }}>
        {place.photo_url ? (
          <img src={place.photo_url} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Hotel size={28} color="rgba(10,10,10,0.12)" />
          </div>
        )}
        {place.badge && (
          <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', fontFamily: PJS }}>
            {place.badge}
          </span>
        )}
        {hovered && onRemove && (
          <button
            onClick={onRemove}
            style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={13} color="#FFFFFF" />
          </button>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS, lineHeight: 1.3 }}>{place.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {place.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0A0A0A', fontFamily: PJS }}>
              <Star size={10} fill="#E03553" color="#E03553" /> {place.rating}
            </span>
          )}
          {place.price_level > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{'$'.repeat(place.price_level)}</span>
          )}
          {place.address && (
            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{place.address}</span>
          )}
        </div>
        {place.note && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: '0 0 8px', fontFamily: PJS, fontStyle: 'italic', lineHeight: 1.5 }}>"{place.note}"</p>
        )}
        {place.maps_url && (
          <a href={place.maps_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none' }}>
            <ExternalLink size={10} /> View on maps
          </a>
        )}
      </div>
    </div>
  );
}

// ── Add a place card ──────────────────────────────────────────────────────────

function AddPlaceCard({ destination, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [badge, setBadge] = useState('');
  const debounceRef = useRef(null);

  const search = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const loc = destination || '';
      const res = await fetch('/api/places-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `hotel ${q.trim()}`, location: loc }),
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
    setSelected(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 400);
  };

  const handleSelect = (place) => {
    setSelected(place);
    setQuery(place.name);
    setShowDropdown(false);
    setResults([]);
  };

  const handleAdd = () => {
    console.log('[AddPlaceCard] handleAdd fired, selected:', selected?.name ?? 'null');
    if (!selected) { toast.error('Select a place first'); return; }
    onAdd({
      place_id: selected.place_id,
      name: selected.name,
      address: selected.address,
      rating: selected.rating,
      price_level: selected.price_level,
      photo_url: selected.photo_reference ? photoProxy(selected.photo_reference) : null,
      maps_url: selected.maps_url,
      note: note.trim(),
      badge: badge || null,
    });
    setSelected(null); setQuery(''); setNote(''); setBadge('');
  };

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, padding: '20px 24px', marginBottom: 32 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px' }}>Add accommodation</p>

      {/* Search — only field visible before a place is chosen */}
      <div style={{ position: 'relative' }}>
        <label style={sectionLabel}>Search Google Places</label>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
          <Input value={query} onChange={handleQueryChange} onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="e.g. Hilton Sydney, boutique hotels…" style={{ paddingLeft: 20 }} />
          {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
          {selected && !searching && (
            <button onClick={() => { setSelected(null); setQuery(''); setNote(''); setBadge(''); }}
              style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {showDropdown && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFF', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: 300, overflowY: 'auto' }}>
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
                    <Hotel size={12} color="rgba(10,10,10,0.2)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', fontFamily: PJS }}>{place.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                </div>
                {place.rating && <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}><Star size={9} fill="#E03553" color="#E03553" /> {place.rating}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected place — note/badge/confirm all in one connected panel */}
      {selected && (
        <div style={{ marginTop: 16, border: '1px solid rgba(224,53,83,0.18)', borderRadius: 6, overflow: 'hidden' }}>
          {/* Place header row */}
          <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.1)' }}>
            {selected.photo_reference ? (
              <img src={photoProxy(selected.photo_reference, 80)} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Hotel size={16} color="rgba(10,10,10,0.2)" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{selected.name}</p>
              {selected.address && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.address}</p>}
            </div>
            {selected.rating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0A0A0A', fontFamily: PJS, flexShrink: 0 }}>
                <Star size={10} fill="#E03553" color="#E03553" /> {selected.rating}
              </span>
            )}
            <button onClick={() => { setSelected(null); setQuery(''); setNote(''); setBadge(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>

          {/* Optional fields + confirm */}
          <div style={{ padding: '14px 14px 16px', background: '#FFF' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 16 }}>
              <div>
                <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Use code WEDDING for 15% off…" />
              </div>
              <div>
                <label style={sectionLabel}>Highlight badge <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <select value={badge} onChange={e => setBadge(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: badge ? '#0A0A0A' : 'rgba(10,10,10,0.4)', outline: 'none', cursor: 'pointer' }}>
                  <option value="">No badge</option>
                  {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleAdd} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                <Plus size={14} /> Add accommodation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GuestSuiteAccommodation() {
  const [details, setDetails] = useState(null);
  const [places, setPlaces] = useState([]);     // owned state — never stale
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaSuggestions, setAvaSuggestions] = useState([]);
  const [avaLoading, setAvaLoading] = useState(false);

  useEffect(() => {
    base44.entities.WeddingDetails.list()
      .then(rows => {
        const d = rows[0] || null;
        setDetails(d);
        setDetailsId(d?.id || null);
        // Hydrate places from Base44 on every mount — source of truth
        setPlaces(d?.guestSuiteAccommodation?.places || []);
      })
      .catch(e => console.error('GuestSuiteAccommodation load error', e))
      .finally(() => setLoading(false));
  }, []);

  const destination = details?.mainCeremony?.address || '';

  const save = async (nextPlaces) => {
    if (!detailsId) { toast.error('No wedding details found'); return; }
    setSaving(true);
    try {
      await base44.entities.WeddingDetails.update(detailsId, {
        guestSuiteAccommodation: { places: nextPlaces },
      });
      toast.success('Saved');
    } catch (err) {
      console.error('GuestSuiteAccommodation save error:', err);
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const handleAdd = (place) => {
    console.log('[GuestSuiteAccommodation] handleAdd called:', place?.name, '| places before:', places.length);
    const next = [...places, { ...place, id: uid() }];
    setPlaces(next);
    save(next);
  };

  const handleRemove = (id) => {
    const next = places.filter(p => p.id !== id);
    setPlaces(next);
    save(next);
  };

  const handleAddFromAva = async (suggestion) => {
    const loc = destination || '';
    let enriched = { ...suggestion, id: uid() };
    try {
      const res = await fetch('/api/places-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `${suggestion.name} hotel`, location: loc }),
      });
      const data = await res.json();
      const top = data.places?.[0];
      if (top) {
        enriched = {
          ...enriched,
          place_id: top.place_id,
          address: top.address || suggestion.area || '',
          rating: top.rating,
          price_level: top.price_level,
          photo_url: top.photo_reference ? photoProxy(top.photo_reference) : null,
          maps_url: top.maps_url,
        };
      }
    } catch {}
    const next = [...places, enriched];
    setPlaces(next);
    save(next);
    setAvaSuggestions(prev => prev.filter(s => s._avaId !== suggestion._avaId));
    toast.success(`${suggestion.name} added`);
  };

  const handleAvaRecommend = async () => {
    if (!destination) { toast.error('Add your venue address in Event Details first'); return; }
    setAvaLoading(true);
    try {
      const prompt = `Recommend 4 accommodation options for wedding guests staying near ${destination}. Include one luxury hotel, one mid-range hotel, one budget hotel, and one boutique/unique stay. For each suggest a REAL property that likely exists near this location.

Return ONLY valid JSON, no markdown:
{"suggestions":[
  {"name":"Exact hotel name","area":"neighbourhood or distance from venue","priceRange":"$200-300/night","description":"2 sentences: why it's great for wedding guests, any standout feature","badge":"Luxury pick"},
  ...
]}

Badge options: "Luxury pick", "Best value", "Closest to venue", "Budget friendly", "Boutique pick"`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const suggestions = (parsed.suggestions || []).map((s, i) => ({ ...s, _avaId: `ava-${i}-${Date.now()}` }));
      setAvaSuggestions(suggestions);
      if (suggestions.length === 0) toast.error('No suggestions returned — try again');
    } catch { toast.error('Ava couldn\'t generate suggestions — try again'); }
    setAvaLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Accommodation"
        subtitle="Places to stay near the wedding venue"
        actions={saving ? <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Saving…</span> : null}
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
                <AvaButton label="Ask Ava to recommend places to stay" onClick={handleAvaRecommend} />
              )}
              {!destination && (
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
                  Add venue in Event Details to unlock Ava recommendations
                </span>
              )}
            </div>

            {/* Ava suggestions */}
            {avaSuggestions.length > 0 && (
              <div style={{ marginBottom: 36 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  Ava's recommendations — click Add to include in your guide
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {avaSuggestions.map(s => (
                    <div key={s._avaId} style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FAFAFA' }}>
                      <div style={{ padding: '16px 16px 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS, lineHeight: 1.3 }}>{s.name}</p>
                          {s.badge && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: '#E03553', color: '#FFF', fontFamily: PJS, flexShrink: 0 }}>{s.badge}</span>
                          )}
                        </div>
                        {s.area && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 6px' }}>{s.area}</p>}
                        {s.priceRange && <p style={{ fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS, margin: '0 0 8px' }}>{s.priceRange}</p>}
                        {s.description && <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 12px', lineHeight: 1.5 }}>{s.description}</p>}
                      </div>
                      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAddFromAva(s)} className="btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}>
                          <Plus size={11} /> Add to guide
                        </button>
                        <button onClick={() => setAvaSuggestions(prev => prev.filter(x => x._avaId !== s._avaId))} className="btn-editorial-secondary" style={{ fontSize: 11, padding: '5px 10px' }}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add a place */}
            <AddPlaceCard destination={destination} onAdd={handleAdd} />

            {/* Saved places */}
            {places.length > 0 ? (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  {places.length} {places.length === 1 ? 'place' : 'places'} added
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {places.map(p => <PlaceCard key={p.id || p.place_id} place={p} onRemove={() => handleRemove(p.id || p.place_id)} />)}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px', borderTop: '1px solid rgba(10,10,10,0.06)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(10,10,10,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Hotel size={22} color="rgba(10,10,10,0.2)" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px' }}>
                  No accommodation added yet
                </p>
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>
                  Search for hotels above, or ask Ava to suggest options near your venue.
                </p>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
