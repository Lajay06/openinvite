import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Star, MapPin, Loader2, Globe } from 'lucide-react';
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
  { key: 'mustEat',        label: 'Must Eat',                   desc: 'Top restaurants your guests absolutely can\'t miss' },
  { key: 'coffee',         label: 'Coffee & Bakeries',          desc: 'Morning stops, afternoon treats, and great espresso' },
  { key: 'hiddenGems',     label: 'Hidden Gems',                desc: 'Local secrets and under-the-radar spots worth finding' },
  { key: 'luxuryDining',   label: 'Luxury Dining',              desc: 'Special occasion restaurants worth every cent' },
  { key: 'nature',         label: 'Beaches & Nature',           desc: 'Outdoor escapes, scenic walks, and waterfront spots' },
  { key: 'nightlife',      label: 'Nightlife',                  desc: 'Bars, rooftop venues, and after-dark adventures' },
  { key: 'thingsToDo',     label: 'Things To Do',               desc: 'Activities, sights, and experiences nearby' },
  { key: 'wellness',       label: 'Recovery & Wellness',        desc: 'Spas, yoga studios, and relaxation spots' },
  { key: 'dayTrips',       label: 'Day Trips',                  desc: 'Nearby destinations worth a half-day or full day out' },
  { key: 'shopping',       label: 'Shopping',                   desc: 'Markets, boutiques, and local finds' },
  { key: 'weddingWeekend', label: 'Wedding Weekend Essentials', desc: 'Key spots and info for the full wedding weekend' },
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

      {/* Tabs — full width, same padding as Guests / Budget */}
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
    <div className="space-y-8">

      {/* Two-column grid for compact fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px 40px', maxWidth: 860 }}>

        {/* Destination (read-only) */}
        <div>
          <label style={sectionLabelStyle}>Destination</label>
          <p style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS, margin: 0, paddingBottom: 10, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            {destination}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '6px 0 0' }}>
            Pulled from your ceremony address in Event Details.
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
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '6px 0 0' }}>
            Shown as the full-screen banner on the guest guide.
          </p>
        </div>
      </div>

      {/* Editorial intro — full width up to max */}
      <div style={{ maxWidth: 720 }}>
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

      {/* Destination vibes — full width, chips wrap naturally */}
      <div>
        <label style={sectionLabelStyle}>Destination vibes</label>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 12px' }}>
          Select all that describe your wedding destination. These appear as tags on the guest guide.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
    <div>
      <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 28px', lineHeight: 1.6, maxWidth: 560 }}>
        Choose which sections appear in your guest guide. Toggle off any categories that aren't relevant to your destination.
      </p>

      <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
        {CATEGORIES.map(cat => {
          const isEnabled = details?.experienceGuide?.categories?.[cat.key]?.enabled !== false;
          const count = details?.experienceGuide?.categories?.[cat.key]?.places?.length || 0;
          return (
            <div
              key={cat.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom: '1px solid rgba(10,10,10,0.06)',
                gap: 16,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS }}>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className="filter-pill"
                      style={{ cursor: 'default', pointerEvents: 'none' }}
                    >
                      {count} {count === 1 ? 'place' : 'places'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                  {cat.desc}
                </p>
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
    <div>
      {/* Search + config row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px 32px', maxWidth: 900, marginBottom: 32 }}>

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
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid #0A0A0A', borderRadius: 0,
              padding: '10px 0', fontSize: 14, fontWeight: 600,
              fontFamily: PJS, color: '#0A0A0A', outline: 'none', cursor: 'pointer',
            }}
          >
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <label style={sectionLabelStyle}>
            Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span>
          </label>
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Ask for the corner table..."
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28 }}>
          <span style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS }}>Mark as couple's pick</span>
          <Switch checked={isCouplePick} onCheckedChange={setIsCouplePick} />
        </div>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <label style={{ ...sectionLabelStyle, marginBottom: 12 }}>Results — click Add to save</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 1, border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, overflow: 'hidden' }}>
            {results.map(place => (
              <div
                key={place.place_id}
                style={{
                  display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center',
                  background: '#FFFFFF', borderRight: '1px solid rgba(10,10,10,0.06)',
                  borderBottom: '1px solid rgba(10,10,10,0.06)',
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

      {/* Saved places by category */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <label style={{ ...sectionLabelStyle, marginBottom: 2 }}>Saved places</label>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
              {savedPlaces.length > 0 ? `${savedPlaces.length} place${savedPlaces.length === 1 ? '' : 's'} in this category` : 'No places added yet'}
            </p>
          </div>
          <select
            value={activeCatView}
            onChange={e => setActiveCatView(e.target.value)}
            style={{
              fontSize: 12, fontWeight: 600, fontFamily: PJS,
              background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(10,10,10,0.18)',
              color: '#0A0A0A', outline: 'none', cursor: 'pointer', padding: '4px 0',
            }}
          >
            {CATEGORIES.map(c => {
              const n = details?.experienceGuide?.categories?.[c.key]?.places?.length || 0;
              return <option key={c.key} value={c.key}>{c.label}{n > 0 ? ` (${n})` : ''}</option>;
            })}
          </select>
        </div>

        {savedPlaces.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, margin: 0 }}>
              Search above and click Add to save places to this category.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, border: '1px solid rgba(10,10,10,0.08)', borderRadius: 6, overflow: 'hidden' }}>
            {savedPlaces.map(place => (
              <div
                key={place.place_id}
                style={{
                  display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center',
                  background: '#FFFFFF', borderRight: '1px solid rgba(10,10,10,0.06)',
                  borderBottom: '1px solid rgba(10,10,10,0.06)',
                }}
              >
                {place.photo_ref ? (
                  <img src={`/api/places-photo?ref=${encodeURIComponent(place.photo_ref)}&maxwidth=80`} alt="" style={{ width: 44, height: 44, objectFit: 'cover', flexShrink: 0, borderRadius: 4 }} />
                ) : (
                  <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', flexShrink: 0, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={14} color="rgba(10,10,10,0.2)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
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
  );
}

// ── Publish tab ────────────────────────────────────────────────────────────────

function PublishTab({ details, onSaveField }) {
  const isPublished = details?.experienceGuide?.published;

  return (
    <div>
      {!isPublished && (
        <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: 480, margin: '0 auto' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Globe size={24} color="rgba(10,10,10,0.3)" strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', margin: '0 0 8px', fontFamily: PJS }}>
            Your guide is hidden
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 32px', fontFamily: PJS, lineHeight: 1.6 }}>
            When published, a "Guide" link appears in your wedding website navigation so guests can access your local recommendations.
          </p>
          <button
            onClick={() => onSaveField('published', true)}
            className="btn-primary"
            style={{ fontSize: 14, padding: '10px 28px' }}
          >
            Publish guide
          </button>
        </div>
      )}

      {isPublished && (
        <div style={{ maxWidth: 600 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 0', borderBottom: '1px solid rgba(10,10,10,0.06)',
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>
                Guide is live
              </p>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>
                Guests can access this from your wedding website navigation.
              </p>
            </div>
            <Switch
              checked={true}
              onCheckedChange={v => onSaveField('published', v)}
            />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.4)', margin: '16px 0 0', fontFamily: PJS, lineHeight: 1.6 }}>
            Toggle off to hide the guide from guests without deleting any content.
          </p>
        </div>
      )}
    </div>
  );
}
