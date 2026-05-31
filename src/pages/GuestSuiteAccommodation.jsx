import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Hotel, MapPin, Star, ExternalLink, ArrowRight, X, Search, Plus } from 'lucide-react';
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
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 18px' }}>Add accommodation</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px 24px', marginBottom: 14 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <label style={sectionLabel}>Search Google Places</label>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
            <Input value={query} onChange={handleQueryChange} onFocus={() => results.length > 0 && setShowDropdown(true)}
              placeholder="e.g. Hilton Sydney, boutique hotels…" style={{ paddingLeft: 20 }} />
            {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
            {selected && !searching && (
              <button onClick={() => { setSelected(null); setQuery(''); }}
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

        {/* Note */}
        <div>
          <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Use code WEDDING for 15% off…" />
        </div>

        {/* Badge + Add */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10 }}>
          <div>
            <label style={sectionLabel}>Highlight badge <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
            <select value={badge} onChange={e => setBadge(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: badge ? '#0A0A0A' : 'rgba(10,10,10,0.4)', outline: 'none', cursor: 'pointer' }}>
              <option value="">No badge</option>
              {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 0' }}>
            <Plus size={14} /> Add place
          </button>
        </div>
      </div>

      {selected && (
        <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(224,53,83,0.04)', borderRadius: 6, border: '1px solid rgba(224,53,83,0.15)', alignItems: 'center' }}>
          {selected.photo_reference && <img src={photoProxy(selected.photo_reference, 60)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', fontFamily: PJS }}>{selected.name}</p>
            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>{selected.address}</p>
          </div>
          <span style={{ fontSize: 11, color: '#E03553', fontWeight: 600, fontFamily: PJS, flexShrink: 0 }}>Selected</span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GuestSuiteAccommodation() {
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaSuggestions, setAvaSuggestions] = useState([]);
  const [avaLoading, setAvaLoading] = useState(false);

  useEffect(() => {
    base44.entities.WeddingDetails.list()
      .then(rows => setDetails(rows[0] || null))
      .catch(e => console.error('GuestSuiteAccommodation load error', e))
      .finally(() => setLoading(false));
  }, []);

  const savedPlaces = details?.guestSuiteAccommodation?.places || [];
  const destination = details?.mainCeremony?.address || '';

  const save = async (places) => {
    if (!details?.id) return;
    setSaving(true);
    try {
      await base44.entities.WeddingDetails.update(details.id, {
        guestSuiteAccommodation: { ...(details.guestSuiteAccommodation || {}), places },
      });
      setDetails(prev => ({ ...prev, guestSuiteAccommodation: { ...(prev.guestSuiteAccommodation || {}), places } }));
      toast.success('Saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const handleAdd = (place) => {
    const next = [...savedPlaces, { ...place, id: uid() }];
    save(next);
  };

  const handleRemove = (id) => {
    save(savedPlaces.filter(p => p.id !== id));
  };

  const handleAddFromAva = async (suggestion) => {
    // Search Google Places to get a real place + photo
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
    const next = [...savedPlaces, enriched];
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

      {/* Connected banner */}
      <div style={{ padding: '10px 32px', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
          ✨ You can also manage properties via your Accommodation planning page
        </span>
        <button onClick={() => navigate('/accommodation')}
          style={{ fontSize: 12, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          Open planning page <ArrowRight size={11} />
        </button>
      </div>

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
            {savedPlaces.length > 0 ? (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  {savedPlaces.length} {savedPlaces.length === 1 ? 'place' : 'places'} added
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {savedPlaces.map(p => <PlaceCard key={p.id || p.place_id} place={p} onRemove={() => handleRemove(p.id || p.place_id)} />)}
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

            {/* Show existing planning page data */}
            {(details?.accommodation?.manualProperties || []).length > 0 && (
              <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
                  From your accommodation planning page
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                  {details.accommodation.manualProperties.map((p, i) => (
                    <div key={p.id || i} style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
                      {p.photoUrl && <img src={p.photoUrl} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />}
                      <div style={{ padding: '12px 14px' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS }}>{p.name}</p>
                        {p.address && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '0 0 6px', fontFamily: PJS }}>{p.address}</p>}
                        {p.description && <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: 0, fontFamily: PJS, lineHeight: 1.5 }}>{p.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
