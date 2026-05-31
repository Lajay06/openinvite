import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Star, MapPin, ExternalLink, Loader2 } from 'lucide-react';

const VIBE_OPTIONS = [
  'Coastal luxury', 'Late-night food scene', 'Historic architecture',
  'Relaxed beach culture', 'World-class dining', 'Art & culture hub',
  'Hidden local gems', 'Outdoor adventure', 'Urban sophistication',
  'Wine country', 'Tropical paradise', 'Mountain escape',
  'Fashion & shopping', 'Wellness & spa', 'Vibrant nightlife',
];

const CATEGORIES = [
  { key: 'mustEat', label: 'Must Eat' },
  { key: 'coffee', label: 'Coffee & Bakeries' },
  { key: 'hiddenGems', label: 'Hidden Gems' },
  { key: 'luxuryDining', label: 'Luxury Dining' },
  { key: 'nature', label: 'Beaches & Nature' },
  { key: 'nightlife', label: 'Nightlife' },
  { key: 'thingsToDo', label: 'Things To Do' },
  { key: 'wellness', label: 'Recovery & Wellness' },
  { key: 'dayTrips', label: 'Day Trips' },
  { key: 'shopping', label: 'Shopping' },
  { key: 'weddingWeekend', label: 'Wedding Weekend Essentials' },
];

const PJS = "'Plus Jakarta Sans', sans-serif";

function photoUrl(ref) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=600`;
}

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
      prompt: `Write a 2-3 sentence editorial introduction for a wedding guest guide to ${destination}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic. Example: "Welcome to our favourite city — where coastal luxury meets late-night energy. We've curated the places that made us fall in love with this corner of the world."`,
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
      place_id: place.place_id,
      name: place.name,
      address: place.address,
      rating: place.rating,
      price_level: place.price_level,
      photo_ref: place.photo_reference,
      maps_url: place.maps_url,
      note: note || '',
      is_couple_pick: isCouplePick,
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

  const destination = details?.experienceGuide?.destination || details?.mainCeremony?.address?.split(',').slice(-3).join(', ') || 'Set your venue in Event Details';

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 104px)' }}>
      {/* LEFT PANEL */}
      <div style={{ width: 360, flexShrink: 0, borderRight: '1px solid #EEEEEE', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #EEEEEE', padding: '0 16px' }}>
          {['setup', 'categories', 'places', 'publish'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveLeftTab(tab)}
              style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: activeLeftTab === tab ? '2px solid #E03553' : '2px solid transparent',
                color: activeLeftTab === tab ? '#0A0A0A' : 'rgba(10,10,10,0.4)', fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: PJS, letterSpacing: '0.06em', textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
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

      {/* RIGHT PANEL — Live Preview */}
      <div style={{ flex: 1, background: '#F5F5F5', overflow: 'auto' }}>
        <LivePreview details={details} destination={destination} />
      </div>
    </div>
  );
}

// ── Setup tab ──────────────────────────────────────────────────────────────────

function SetupTab({ details, destination, onSaveField, onGenerateIntro, onToggleVibe }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Destination</label>
        <p style={{ fontSize: 13, color: '#0A0A0A', padding: '8px 0', borderBottom: '1px solid #EEE', margin: 0 }}>{destination}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Hero photo URL</label>
        <input
          type="text"
          value={details?.experienceGuide?.heroPhotoUrl || ''}
          onChange={(e) => onSaveField('heroPhotoUrl', e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={labelStyle}>Editorial intro</label>
          <button onClick={onGenerateIntro} style={{ fontSize: 11, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: PJS }}>✦ Generate</button>
        </div>
        <textarea
          value={details?.experienceGuide?.editorialIntro || ''}
          onChange={(e) => onSaveField('editorialIntro', e.target.value)}
          rows={4}
          placeholder="Write an inspiring introduction to your wedding destination..."
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Destination vibes</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {VIBE_OPTIONS.map(vibe => {
            const active = (details?.experienceGuide?.vibes || []).includes(vibe);
            return (
              <button
                key={vibe}
                onClick={() => onToggleVibe(vibe)}
                style={{
                  padding: '6px 12px', border: `1px solid ${active ? '#E03553' : '#EEE'}`,
                  background: active ? 'rgba(224,53,83,0.06)' : 'transparent',
                  color: active ? '#E03553' : 'rgba(10,10,10,0.4)', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: PJS, borderRadius: 999,
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
      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', marginBottom: 16, fontFamily: PJS }}>Toggle which sections appear in your guest guide.</p>
      {CATEGORIES.map(cat => {
        const isEnabled = details?.experienceGuide?.categories?.[cat.key]?.enabled !== false;
        const count = details?.experienceGuide?.categories?.[cat.key]?.places?.length || 0;
        return (
          <div key={cat.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F5F5F5' }}>
            <div>
              <span style={{ fontSize: 13, color: '#0A0A0A', fontWeight: 500, fontFamily: PJS }}>{cat.label}</span>
              {count > 0 && <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{count} places</span>}
            </div>
            <button
              onClick={() => onToggleCategory(cat.key)}
              style={{
                width: 44, height: 24, borderRadius: 12, border: 'none',
                background: isEnabled ? '#E03553' : '#E0E0E0', cursor: 'pointer',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: isEnabled ? 22 : 2,
                width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
        );
      })}
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
      const location = destination !== 'Set your venue in Event Details' ? destination : '';
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: q.trim(), location }),
      });
      const data = await res.json();
      setResults(data.places || []);
    } catch {
      toast.error('Search failed');
    }
    setSearching(false);
  };

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(v), 600);
  };

  const handleAdd = (place) => {
    onAddPlace(place, selectedCat, note, isCouplePick);
    setNote('');
    setIsCouplePick(false);
  };

  const savedPlaces = details?.experienceGuide?.categories?.[activeCatView]?.places || [];

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Search Google Places</label>
        <div style={{ position: 'relative', marginTop: 8 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.3)' }} />
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="e.g. romantic restaurants, rooftop bars..."
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
          {searching && <Loader2 size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Add-to config */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          style={{ flex: 1, minWidth: 140, border: '1px solid #EEE', padding: '8px 10px', fontSize: 12, fontFamily: PJS, background: '#FFF', color: '#0A0A0A' }}
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={isCouplePick} onChange={(e) => setIsCouplePick(e.target.checked)} />
          Couple's pick
        </label>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note for guests... (optional)"
          style={inputStyle}
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...labelStyle, marginBottom: 10 }}>Results — select to add</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(place => (
              <PlaceResultRow key={place.place_id} place={place} onAdd={() => handleAdd(place)} />
            ))}
          </div>
        </div>
      )}

      {/* Saved places by category */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={labelStyle}>Saved places</label>
          <select
            value={activeCatView}
            onChange={(e) => setActiveCatView(e.target.value)}
            style={{ border: '1px solid #EEE', padding: '4px 8px', fontSize: 11, fontFamily: PJS, background: '#FFF', color: '#0A0A0A' }}
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {savedPlaces.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, textAlign: 'center', padding: '20px 0' }}>
            No places added to {CATEGORIES.find(c => c.key === activeCatView)?.label} yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedPlaces.map(place => (
              <SavedPlaceRow key={place.place_id} place={place} onRemove={() => onRemovePlace(activeCatView, place.place_id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceResultRow({ place, onAdd }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 12px', border: '1px solid #EEEEEE', background: '#FAFAFA', alignItems: 'flex-start' }}>
      {place.photo_reference ? (
        <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_reference)}&maxwidth=80`} alt="" style={{ width: 48, height: 48, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 48, height: 48, background: '#EEEEEE', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.address}</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {place.rating && <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} fill="#E03553" color="#E03553" />{place.rating}</span>}
          {place.price_level != null && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{'$'.repeat(place.price_level || 1)}</span>}
        </div>
      </div>
      <button
        onClick={onAdd}
        style={{ flexShrink: 0, padding: '6px 14px', background: '#E03553', color: '#FFFFFF', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: PJS, borderRadius: 999 }}
      >
        Add
      </button>
    </div>
  );
}

function SavedPlaceRow({ place, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', border: '1px solid #EEEEEE', alignItems: 'flex-start' }}>
      {place.photo_ref ? (
        <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_ref)}&maxwidth=80`} alt="" style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 40, height: 40, background: '#EEEEEE', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
        {place.note && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, fontStyle: 'italic' }}>"{place.note}"</p>}
        {place.is_couple_pick && <span style={{ fontSize: 10, color: '#E03553', fontWeight: 700, fontFamily: PJS }}>★ Couple's pick</span>}
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Publish tab ────────────────────────────────────────────────────────────────

function PublishTab({ details, onSaveField }) {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => onSaveField('published', !details?.experienceGuide?.published)}
          style={{
            width: '100%', padding: '14px 16px', border: 'none',
            background: details?.experienceGuide?.published ? '#E03553' : '#E0E0E0',
            color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: PJS, borderRadius: 4,
          }}
        >
          {details?.experienceGuide?.published ? '● Published' : '○ Hidden — click to publish'}
        </button>
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', marginTop: 12, lineHeight: 1.6, fontFamily: PJS }}>
          When published, guests can access this from the "Guide" link in your wedding website navigation.
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
    <div style={{ maxWidth: 440, margin: '32px auto', background: '#FFFFFF', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Guest Guide Preview</span>
        <span style={{ fontSize: 11, color: guide.published ? '#E03553' : 'rgba(10,10,10,0.3)', fontWeight: 700, fontFamily: PJS }}>{guide.published ? 'Live' : 'Hidden'}</span>
      </div>

      <div style={{ height: 320, background: guide.heroPhotoUrl ? `url(${guide.heroPhotoUrl}) center/cover` : 'linear-gradient(135deg, #0A1930, #1A0A20)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
        <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 28, color: '#FFFFFF', margin: 0, lineHeight: 1.1 }}>{destination.split(',')[0] || 'Destination'}</h1>
          {guide.editorialIntro && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '8px 0 0', lineHeight: 1.5 }}>{guide.editorialIntro.slice(0, 100)}{guide.editorialIntro.length > 100 ? '…' : ''}</p>}
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', marginBottom: 10, fontFamily: PJS }}>{enabledCats.length} sections enabled</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {enabledCats.slice(0, 6).map(cat => {
            const count = guide.categories?.[cat.key]?.places?.length || 0;
            return (
              <span key={cat.key} style={{ padding: '4px 10px', background: '#F5F5F5', fontSize: 11, color: '#555', fontWeight: 500, fontFamily: PJS, borderRadius: 999 }}>
                {cat.label}{count > 0 ? ` (${count})` : ''}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────

const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: '1px solid #EEEEEE', padding: '10px 12px',
  fontSize: 13, outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0A0A0A', background: '#FFFFFF', boxSizing: 'border-box',
};
