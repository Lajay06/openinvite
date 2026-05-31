import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Star, MapPin, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const PJS = "'Plus Jakarta Sans', sans-serif";

const VIBE_OPTIONS = [
  'Coastal luxury', 'Late-night food scene', 'Historic architecture',
  'Relaxed beach culture', 'World-class dining', 'Art & culture hub',
  'Hidden local gems', 'Outdoor adventure', 'Urban sophistication',
  'Wine country', 'Tropical paradise', 'Mountain escape',
  'Fashion & shopping', 'Wellness & spa', 'Vibrant nightlife',
];

const CATEGORIES = [
  { key: 'mustEat',        label: 'Must Eat' },
  { key: 'coffee',         label: 'Coffee & Bakeries' },
  { key: 'hiddenGems',     label: 'Hidden Gems' },
  { key: 'luxuryDining',   label: 'Luxury Dining' },
  { key: 'nature',         label: 'Beaches & Nature' },
  { key: 'nightlife',      label: 'Nightlife' },
  { key: 'thingsToDo',     label: 'Things To Do' },
  { key: 'wellness',       label: 'Recovery & Wellness' },
  { key: 'dayTrips',       label: 'Day Trips' },
  { key: 'shopping',       label: 'Shopping' },
  { key: 'weddingWeekend', label: 'Wedding Weekend Essentials' },
];

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS,
  marginBottom: 8,
  display: 'block',
};

export default function ExperienceGuideTab({ details }) {
  const [activeTab, setActiveTab] = useState('setup');
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
    const destination =
      details?.experienceGuide?.destination ||
      details?.mainCeremony?.address?.split(',').slice(-3).join(', ') ||
      'our destination';
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a 2-3 sentence editorial introduction for a wedding guest guide to ${destination}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic.`,
    });
    updateMutation.mutate({ editorialIntro: response });
  };

  const handleSaveField = (field, value) => updateMutation.mutate({ [field]: value });

  const handleToggleVibe = (vibe) => {
    const current = details?.experienceGuide?.vibes || [];
    const next = current.includes(vibe)
      ? current.filter(v => v !== vibe)
      : [...current, vibe];
    updateMutation.mutate({ vibes: next });
  };

  const handleToggleCategory = (catKey) => {
    const current = details?.experienceGuide?.categories || {};
    const updated = {
      ...current,
      [catKey]: { ...current[catKey], enabled: !current[catKey]?.enabled },
    };
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
      couplePicks = [
        ...couplePicks,
        { ...saved, category: CATEGORIES.find(c => c.key === catKey)?.label || catKey },
      ];
    }

    updateMutation.mutate({ categories, couplePicks });
    toast.success(`Added to ${CATEGORIES.find(c => c.key === catKey)?.label}`);
  };

  const handleRemovePlace = (catKey, placeId) => {
    const guide = details?.experienceGuide || {};
    const categories = { ...(guide.categories || {}) };
    categories[catKey] = {
      ...(categories[catKey] || {}),
      places: (categories[catKey]?.places || []).filter(p => p.place_id !== placeId),
    };
    const couplePicks = (guide.couplePicks || []).filter(p => p.place_id !== placeId);
    updateMutation.mutate({ categories, couplePicks });
  };

  const destination =
    details?.experienceGuide?.destination ||
    details?.mainCeremony?.address?.split(',').slice(-3).join(', ') ||
    'Set your venue in Event Details';

  return (
    <div style={{ background: '#FFFFFF' }}>

      {/* Page title — matches DashboardPageHeader style */}
      <div
        className="flex items-center justify-between gap-4 px-4 md:px-8"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', paddingTop: 10, paddingBottom: 10 }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Experience guide
          </h2>
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, flexShrink: 0 }}>
            Curate local recommendations for your guests
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '32px 32px 48px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-8">
            <SetupTab
              details={details}
              destination={destination}
              onSaveField={handleSaveField}
              onGenerateIntro={handleGenerateIntro}
              onToggleVibe={handleToggleVibe}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-8">
            <CategoriesTab details={details} onToggleCategory={handleToggleCategory} />
          </TabsContent>

          <TabsContent value="places" className="mt-8">
            <PlacesTab
              details={details}
              destination={destination}
              onAddPlace={handleAddPlace}
              onRemovePlace={handleRemovePlace}
            />
          </TabsContent>

          <TabsContent value="publish" className="mt-8">
            <PublishTab details={details} onSaveField={handleSaveField} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Setup tab ──────────────────────────────────────────────────────────────────

function SetupTab({ details, destination, onSaveField, onGenerateIntro, onToggleVibe }) {
  return (
    <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Destination (read-only) */}
      <div>
        <label style={sectionLabelStyle}>Destination</label>
        <p style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS, margin: 0, paddingBottom: 8, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {destination}
        </p>
      </div>

      {/* Hero photo URL */}
      <div>
        <label style={sectionLabelStyle}>Hero photo URL</label>
        <Input
          type="text"
          value={details?.experienceGuide?.heroPhotoUrl || ''}
          onChange={e => onSaveField('heroPhotoUrl', e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Editorial intro */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...sectionLabelStyle, marginBottom: 0 }}>Editorial intro</label>
          <button
            onClick={onGenerateIntro}
            className="btn-editorial-secondary"
            style={{ fontSize: 11, padding: '4px 10px' }}
          >
            ✦ Generate with AI
          </button>
        </div>
        <textarea
          value={details?.experienceGuide?.editorialIntro || ''}
          onChange={e => onSaveField('editorialIntro', e.target.value)}
          rows={4}
          placeholder="Write an inspiring introduction to your wedding destination..."
          style={{
            width: '100%',
            border: '1px solid rgba(10,10,10,0.15)',
            borderRadius: 6,
            padding: '10px 12px',
            fontSize: 14,
            fontFamily: PJS,
            color: '#0A0A0A',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
            lineHeight: 1.6,
          }}
          onFocus={e => { e.target.style.borderColor = '#E03553'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(10,10,10,0.15)'; }}
        />
      </div>

      {/* Destination vibes */}
      <div>
        <label style={sectionLabelStyle}>Destination vibes</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {VIBE_OPTIONS.map(vibe => {
            const active = (details?.experienceGuide?.vibes || []).includes(vibe);
            return (
              <button
                key={vibe}
                onClick={() => onToggleVibe(vibe)}
                className={`filter-pill${active ? ' active' : ''}`}
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
    <div style={{ maxWidth: 600 }}>
      <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px', lineHeight: 1.6 }}>
        Choose which sections appear in your guest guide.
      </p>

      <div>
        {CATEGORIES.map((cat, i) => {
          const isEnabled = details?.experienceGuide?.categories?.[cat.key]?.enabled !== false;
          const count = details?.experienceGuide?.categories?.[cat.key]?.places?.length || 0;
          return (
            <div
              key={cat.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 0',
                borderBottom: i < CATEGORIES.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS }}>{cat.label}</span>
                {count > 0 && (
                  <span
                    className="filter-pill"
                    style={{ cursor: 'default', pointerEvents: 'none' }}
                  >
                    {count}
                  </span>
                )}
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={() => onToggleCategory(cat.key)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Places tab ─────────────────────────────────────────────────────────────────

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
    } catch {
      toast.error('Search failed');
    }
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
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>

        {/* Left: search + add */}
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={sectionLabelStyle}>Search Google Places</label>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
              <Input
                value={query}
                onChange={handleQueryChange}
                placeholder="e.g. romantic restaurants, rooftop bars..."
                style={{ paddingLeft: 20 }}
              />
              {searching && (
                <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />
              )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>

          <div>
            <label style={sectionLabelStyle}>Add to category</label>
            <select
              value={selectedCat}
              onChange={e => setSelectedCat(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid #0A0A0A',
                borderRadius: 0,
                padding: '10px 0',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: PJS,
                color: '#0A0A0A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label style={{ ...sectionLabelStyle }}>
              Note for guests <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>(optional)</span>
            </label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Ask for the corner table..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid rgba(10,10,10,0.06)', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
            <span style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS }}>Mark as couple's pick</span>
            <Switch checked={isCouplePick} onCheckedChange={setIsCouplePick} />
          </div>

          {/* Search results */}
          {results.length > 0 && (
            <div>
              <label style={sectionLabelStyle}>Results</label>
              <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                {results.map((place, i) => (
                  <div
                    key={place.place_id}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center',
                      borderBottom: i < results.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    {place.photo_reference ? (
                      <img
                        src={`/api/places-photo?ref=${encodeURIComponent(place.photo_reference)}&maxwidth=80`}
                        alt=""
                        style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0, borderRadius: 4 }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', flexShrink: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MapPin size={14} color="rgba(10,10,10,0.2)" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
                      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                        {place.rating && (
                          <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Star size={10} fill="#E03553" color="#E03553" /> {place.rating}
                          </span>
                        )}
                        {place.price_level != null && place.price_level > 0 && (
                          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{'$'.repeat(place.price_level)}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleAdd(place)} className="btn-primary" style={{ fontSize: 11, padding: '5px 12px', flexShrink: 0 }}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: saved places */}
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label style={{ ...sectionLabelStyle, marginBottom: 0 }}>Saved places</label>
            <select
              value={activeCatView}
              onChange={e => setActiveCatView(e.target.value)}
              style={{
                fontSize: 11, fontWeight: 600, fontFamily: PJS,
                background: 'transparent', border: 'none',
                borderBottom: '1px solid rgba(10,10,10,0.18)',
                color: '#0A0A0A', outline: 'none', cursor: 'pointer', padding: '2px 0',
              }}
            >
              {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>

          {savedPlaces.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, padding: '20px 0' }}>
              No places added to this category yet.
            </p>
          ) : (
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, overflow: 'hidden' }}>
              {savedPlaces.map((place, i) => (
                <div
                  key={place.place_id}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 14px', alignItems: 'center',
                    borderBottom: i < savedPlaces.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                    background: '#FFFFFF',
                  }}
                >
                  {place.photo_ref ? (
                    <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_ref)}&maxwidth=80`} alt="" style={{ width: 36, height: 36, objectFit: 'cover', flexShrink: 0, borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: 'rgba(10,10,10,0.04)', flexShrink: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={11} color="rgba(10,10,10,0.2)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 1px', fontFamily: PJS }}>{place.name}</p>
                    {place.note && (
                      <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, fontStyle: 'italic' }}>"{place.note}"</p>
                    )}
                    {place.is_couple_pick && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>★ Couple's pick</span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemovePlace(activeCatView, place.place_id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 0, flexShrink: 0 }}
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
    </div>
  );
}

// ── Publish tab ────────────────────────────────────────────────────────────────

function PublishTab({ details, onSaveField }) {
  const isPublished = details?.experienceGuide?.published;

  return (
    <div style={{ maxWidth: 600 }}>

      {/* Publish toggle row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 0',
          borderBottom: '1px solid rgba(10,10,10,0.06)',
        }}
      >
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
            {isPublished ? 'Guide is live' : 'Guide is hidden'}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>
            {isPublished
              ? 'Guests can access this from your wedding website navigation.'
              : 'Only you can see this. Toggle on to make it visible to guests.'}
          </p>
        </div>
        <Switch
          checked={!!isPublished}
          onCheckedChange={v => onSaveField('published', v)}
        />
      </div>

      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: '16px 0 0', fontFamily: PJS, lineHeight: 1.6 }}>
        When published, a "Guide" link appears in your wedding website navigation bar for all guests to access.
      </p>
    </div>
  );
}
