import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Star, MapPin, Loader2, ExternalLink } from 'lucide-react';

// ── Design tokens ──────────────────────────────────────────────────────────────
const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS,
  marginBottom: 8,
};

const inputStyle = {
  width: '100%',
  border: 'none',
  borderBottom: '1px solid rgba(10,10,10,0.18)',
  borderRadius: 0,
  padding: '8px 0',
  fontSize: 14,
  fontFamily: PJS,
  color: '#0A0A0A',
  background: 'transparent',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle = {
  width: '100%',
  border: '1px solid #EEEEEE',
  borderRadius: 0,
  padding: '10px 12px',
  fontSize: 13,
  fontFamily: PJS,
  color: '#0A0A0A',
  outline: 'none',
  resize: 'none',
  boxSizing: 'border-box',
  lineHeight: 1.6,
};

// ── Data ───────────────────────────────────────────────────────────────────────
const VIBE_OPTIONS = [
  'Coastal luxury', 'Late-night food scene', 'Historic architecture',
  'Relaxed beach culture', 'World-class dining', 'Art & culture hub',
  'Hidden local gems', 'Outdoor adventure', 'Urban sophistication',
  'Wine country', 'Tropical paradise', 'Mountain escape',
  'Fashion & shopping', 'Wellness & spa', 'Vibrant nightlife',
];

const CATEGORIES = [
  { key: 'mustEat',       label: 'Must Eat' },
  { key: 'coffee',        label: 'Coffee & Bakeries' },
  { key: 'hiddenGems',    label: 'Hidden Gems' },
  { key: 'luxuryDining',  label: 'Luxury Dining' },
  { key: 'nature',        label: 'Beaches & Nature' },
  { key: 'nightlife',     label: 'Nightlife' },
  { key: 'thingsToDo',    label: 'Things To Do' },
  { key: 'wellness',      label: 'Recovery & Wellness' },
  { key: 'dayTrips',      label: 'Day Trips' },
  { key: 'shopping',      label: 'Shopping' },
  { key: 'weddingWeekend',label: 'Wedding Weekend Essentials' },
];

// ── Small reusable Toggle ──────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
        cursor: 'pointer', flexShrink: 0, position: 'relative',
        background: value ? '#E03553' : '#DDDDDD',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', width: 18, height: 18, borderRadius: '50%',
        background: '#FFFFFF', top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s',
      }} />
    </button>
  );
}

// ── SectionDivider ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 12px' }}>
      {children}
    </p>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ExperienceGuideTab({ details }) {
  const [activeLeftTab, setActiveLeftTab] = useState('setup');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const current = details || {};
      const experienceGuide = { ...(current.experienceGuide || {}), ...updates };
      if (current.id) {
        await base44.entities.WeddingDetails.update(current.id, { experienceGuide });
      } else {
        await base44.entities.WeddingDetails.create({ experienceGuide, slug: 'temp' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guestSuiteDetails']);
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleGenerateIntro = async () => {
    const destination = details?.experienceGuide?.destination || details?.mainCeremony?.address?.split(',').slice(-3).join(', ') || 'our destination';
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a 2-3 sentence editorial introduction for a wedding guest guide to ${destination}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic.`,
    });
    updateMutation.mutate({ editorialIntro: response });
  };

  const handleSaveField = (field, value) => updateMutation.mutate({ [field]: value });

  const handleToggleVibe = (vibe) => {
    const current = details?.experienceGuide?.vibes || [];
    const next = current.includes(vibe) ? current.filter(v => v !== vibe) : [...current, vibe];
    updateMutation.mutate({ vibes: next });
  };

  const handleToggleCategory = (catKey) => {
    const current = details?.experienceGuide?.categories || {};
    const updated = { ...current, [catKey]: { ...current[catKey], enabled: !current[catKey]?.enabled } };
    updateMutation.mutate({ categories: updated });
  };

  const handleAddPlace = (place, catKey, note, isCouplePick) => {
    const guide = details?.experienceGuide || {};
    const categories = { ...(guide.categories || {}) };
    const catPlaces = [...(categories[catKey]?.places || [])];

    if (catPlaces.find(p => p.place_id === place.place_id)) {
      toast.error('Already added');
      return;
    }

    const saved = {
      place_id: place.place_id, name: place.name, address: place.address,
      rating: place.rating, price_level: place.price_level,
      photo_ref: place.photo_reference, maps_url: place.maps_url,
      note: note || '', is_couple_pick: isCouplePick,
    };

    categories[catKey] = { ...(categories[catKey] || {}), places: [...catPlaces, saved] };

    let couplePicks = [...(guide.couplePicks || [])];
    if (isCouplePick && !couplePicks.find(p => p.place_id === place.place_id)) {
      couplePicks = [...couplePicks, { ...saved, category: CATEGORIES.find(c => c.key === catKey)?.label || catKey }];
    }

    updateMutation.mutate({ categories, couplePicks });
    toast.success(`Added to ${CATEGORIES.find(c => c.key === catKey)?.label}`);
  };

  const handleRemovePlace = (catKey, placeId) => {
    const guide = details?.experienceGuide || {};
    const categories = { ...(guide.categories || {}) };
    categories[catKey] = { ...(categories[catKey] || {}), places: (categories[catKey]?.places || []).filter(p => p.place_id !== placeId) };
    const couplePicks = (guide.couplePicks || []).filter(p => p.place_id !== placeId);
    updateMutation.mutate({ categories, couplePicks });
  };

  const destination = details?.experienceGuide?.destination ||
    details?.mainCeremony?.address?.split(',').slice(-3).join(', ') ||
    'Set your venue in Event Details';

  const LEFT_TABS = ['setup', 'categories', 'places', 'publish'];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 104px)', overflow: 'hidden' }}>

      {/* ── LEFT PANEL — editor ──────────────────────────────────────────────── */}
      <div style={{ width: 380, flexShrink: 0, borderRight: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Inner tab bar */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 44, borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 20px', flexShrink: 0 }}>
          {LEFT_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveLeftTab(tab)}
              style={{
                height: 44, padding: '0 12px', background: 'transparent', border: 'none',
                borderBottom: activeLeftTab === tab ? '2px solid #E03553' : '2px solid transparent',
                color: activeLeftTab === tab ? '#0A0A0A' : '#888888',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: PJS,
                whiteSpace: 'nowrap', transition: 'color 0.15s, border-color 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
          {activeLeftTab === 'setup' && (
            <SetupTab
              details={details}
              destination={destination}
              onSaveField={handleSaveField}
              onGenerateIntro={handleGenerateIntro}
              onToggleVibe={handleToggleVibe}
            />
          )}
          {activeLeftTab === 'categories' && (
            <CategoriesTab details={details} onToggleCategory={handleToggleCategory} />
          )}
          {activeLeftTab === 'places' && (
            <PlacesTab
              details={details}
              destination={destination}
              onAddPlace={handleAddPlace}
              onRemovePlace={handleRemovePlace}
            />
          )}
          {activeLeftTab === 'publish' && (
            <PublishTab details={details} onSaveField={handleSaveField} />
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — live preview ───────────────────────────────────────── */}
      <div style={{ flex: 1, background: 'rgba(10,10,10,0.02)', overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 24px' }}>
        <LivePreview details={details} destination={destination} />
      </div>
    </div>
  );
}

// ── Setup tab ──────────────────────────────────────────────────────────────────
function SetupTab({ details, destination, onSaveField, onGenerateIntro, onToggleVibe }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      <div>
        <label style={labelStyle}>Destination</label>
        <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, margin: 0, padding: '8px 0', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {destination}
        </p>
      </div>

      <div>
        <label style={labelStyle}>Hero photo URL</label>
        <input
          type="text"
          value={details?.experienceGuide?.heroPhotoUrl || ''}
          onChange={e => onSaveField('heroPhotoUrl', e.target.value)}
          placeholder="https://..."
          style={inputStyle}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Editorial intro</label>
          <button
            onClick={onGenerateIntro}
            style={{ fontSize: 11, fontWeight: 700, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, padding: 0 }}
          >
            ✦ Generate
          </button>
        </div>
        <textarea
          value={details?.experienceGuide?.editorialIntro || ''}
          onChange={e => onSaveField('editorialIntro', e.target.value)}
          rows={4}
          placeholder="Write an inspiring introduction to your wedding destination..."
          style={textareaStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Destination vibes</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VIBE_OPTIONS.map(vibe => {
            const active = (details?.experienceGuide?.vibes || []).includes(vibe);
            return (
              <button
                key={vibe}
                onClick={() => onToggleVibe(vibe)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: `1px solid ${active ? '#E03553' : 'rgba(10,10,10,0.12)'}`,
                  background: active ? 'rgba(224,53,83,0.06)' : 'transparent',
                  color: active ? '#E03553' : 'rgba(10,10,10,0.5)',
                  fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: PJS,
                  transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                }}
              >
                {vibe}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Categories tab ─────────────────────────────────────────────────────────────
function CategoriesTab({ details, onToggleCategory }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 20px', lineHeight: 1.6 }}>
        Toggle which sections appear in your guest guide.
      </p>

      <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
        {CATEGORIES.map((cat, i) => {
          const isEnabled = details?.experienceGuide?.categories?.[cat.key]?.enabled !== false;
          const count = details?.experienceGuide?.categories?.[cat.key]?.places?.length || 0;
          return (
            <div
              key={cat.key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < CATEGORIES.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                background: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS }}>{cat.label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>({count})</span>
                )}
              </div>
              <Toggle value={isEnabled} onChange={() => onToggleCategory(cat.key)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Places search tab ──────────────────────────────────────────────────────────
function PlacesTab({ details, destination, onAddPlace, onRemovePlace }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].key);
  const [note, setNote] = useState('');
  const [isCouplePick, setIsCouplePick] = useState(false);
  const [activeCatView, setActiveCatView] = useState(CATEGORIES[0].key);
  const debounceRef = useRef(null);

  const handleSearch = async (q) => {
    if (!q.trim() || q.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const loc = destination !== 'Set your venue in Event Details' ? destination : '';
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: q.trim(), location: loc }),
      });
      const data = await res.json();
      setResults(data.places || []);
    } catch { toast.error('Search failed'); }
    setSearching(false);
  };

  const handleQueryChange = e => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(v), 600);
  };

  const handleAdd = place => {
    onAddPlace(place, selectedCat, note, isCouplePick);
    setNote('');
    setIsCouplePick(false);
  };

  const savedPlaces = details?.experienceGuide?.categories?.[activeCatView]?.places || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Search input */}
      <div>
        <label style={labelStyle}>Search Google Places</label>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)' }} />
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. romantic restaurants, rooftop bars..."
            style={{ ...inputStyle, paddingLeft: 20 }}
            onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
            onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
          />
          {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Category + couple pick selectors */}
      <div>
        <label style={labelStyle}>Add to category</label>
        <select
          value={selectedCat}
          onChange={e => setSelectedCat(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; }}
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Ask for the corner table..."
          style={inputStyle}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
        />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <Toggle value={isCouplePick} onChange={setIsCouplePick} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>Mark as couple's pick</span>
      </label>

      {/* Search results */}
      {results.length > 0 && (
        <div>
          <label style={labelStyle}>Results — click Add to save</label>
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
            {results.map((place, i) => (
              <div
                key={place.place_id}
                style={{
                  display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'flex-start',
                  borderBottom: i < results.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                  background: '#FFFFFF',
                }}
              >
                {place.photo_reference ? (
                  <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_reference)}&maxwidth=80`} alt="" style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, background: 'rgba(10,10,10,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={12} color="rgba(10,10,10,0.2)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '0 0 3px', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {place.rating && (
                      <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Star size={9} fill="#E03553" color="#E03553" /> {place.rating}
                      </span>
                    )}
                    {place.price_level != null && place.price_level > 0 && (
                      <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{'$'.repeat(place.price_level)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(place)}
                  className="btn-primary"
                  style={{ flexShrink: 0, fontSize: 11, padding: '5px 12px' }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved places by category */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Saved places</label>
          <select
            value={activeCatView}
            onChange={e => setActiveCatView(e.target.value)}
            style={{ fontSize: 11, fontWeight: 600, fontFamily: PJS, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'transparent', color: '#0A0A0A', outline: 'none', cursor: 'pointer', padding: '2px 0' }}
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {savedPlaces.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, textAlign: 'center', padding: '20px 0', border: '1px solid rgba(10,10,10,0.06)' }}>
            No places added yet
          </p>
        ) : (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
            {savedPlaces.map((place, i) => (
              <div
                key={place.place_id}
                style={{
                  display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'flex-start',
                  borderBottom: i < savedPlaces.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                  background: '#FFFFFF',
                }}
              >
                {place.photo_ref ? (
                  <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_ref)}&maxwidth=80`} alt="" style={{ width: 36, height: 36, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, background: 'rgba(10,10,10,0.04)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={11} color="rgba(10,10,10,0.2)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
                  {place.note && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.5)', margin: 0, fontFamily: PJS, fontStyle: 'italic' }}>"{place.note}"</p>}
                  {place.is_couple_pick && <span style={{ fontSize: 10, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>★ Couple's pick</span>}
                </div>
                <button
                  onClick={() => onRemovePlace(activeCatView, place.place_id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 0, flexShrink: 0, lineHeight: 1 }}
                  aria-label="Remove"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Publish tab ────────────────────────────────────────────────────────────────
function PublishTab({ details, onSaveField }) {
  const isPublished = details?.experienceGuide?.published;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
              {isPublished ? 'Guide is live' : 'Guide is hidden'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>
              {isPublished ? 'Guests can see this from your wedding website' : 'Only you can see this'}
            </p>
          </div>
          <Toggle value={!!isPublished} onChange={v => onSaveField('published', v)} />
        </div>
        <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', margin: '12px 0' }} />
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, lineHeight: 1.6 }}>
          When published, a "Guide" link appears in your wedding website navigation.
        </p>
      </div>

    </div>
  );
}

// ── Live Preview ───────────────────────────────────────────────────────────────
function LivePreview({ details, destination }) {
  const guide = details?.experienceGuide || {};
  const enabledCats = CATEGORIES.filter(c => guide.categories?.[c.key]?.enabled !== false);

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 16px' }}>
        Preview
      </p>

      <div style={{ border: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', overflow: 'hidden' }}>
        {/* Status bar */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Guest guide</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', fontFamily: PJS,
            padding: '2px 8px', borderRadius: 999,
            background: guide.published ? 'rgba(224,53,83,0.08)' : 'rgba(10,10,10,0.06)',
            color: guide.published ? '#E03553' : 'rgba(10,10,10,0.4)',
          }}>
            {guide.published ? 'Live' : 'Hidden'}
          </span>
        </div>

        {/* Hero image */}
        <div style={{
          height: 200, position: 'relative', overflow: 'hidden',
          background: guide.heroPhotoUrl
            ? `url(${guide.heroPhotoUrl}) center/cover no-repeat`
            : 'linear-gradient(135deg, #0A1930, #1A0A20)',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }} />
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: 0, fontFamily: PJS, lineHeight: 1.2 }}>
              {destination.split(',')[0] || 'Destination'}
            </p>
            {guide.editorialIntro && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '6px 0 0', fontFamily: PJS, lineHeight: 1.5 }}>
                {guide.editorialIntro.length > 90 ? guide.editorialIntro.slice(0, 90) + '…' : guide.editorialIntro}
              </p>
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={{ padding: '16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 10px' }}>
            {enabledCats.length} of {CATEGORIES.length} sections enabled
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {enabledCats.slice(0, 8).map(cat => {
              const count = guide.categories?.[cat.key]?.places?.length || 0;
              return (
                <span key={cat.key} style={{
                  fontSize: 11, fontWeight: 600, fontFamily: PJS,
                  padding: '3px 10px', borderRadius: 999,
                  background: count > 0 ? 'rgba(224,53,83,0.06)' : 'rgba(10,10,10,0.05)',
                  color: count > 0 ? '#E03553' : 'rgba(10,10,10,0.45)',
                  border: `1px solid ${count > 0 ? 'rgba(224,53,83,0.15)' : 'transparent'}`,
                }}>
                  {cat.label}{count > 0 ? ` · ${count}` : ''}
                </span>
              );
            })}
          </div>

          {/* Vibes */}
          {guide.vibes?.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 8px' }}>Vibes</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {guide.vibes.map(v => (
                  <span key={v} style={{ fontSize: 10, fontWeight: 600, fontFamily: PJS, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', color: 'rgba(10,10,10,0.5)' }}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
