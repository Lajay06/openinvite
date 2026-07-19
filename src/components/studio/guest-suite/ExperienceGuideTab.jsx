import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, X, Star, MapPin, Loader2, Globe, Plus, Heart, Clock, Navigation, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import AvaButton from '@/components/shared/AvaButton';

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

const TIME_BLOCKS = ['morning', 'afternoon', 'evening'];
const ITINERARY_LENGTHS = [1, 3, 5];

const sectionLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 8, display: 'block',
};

function photoProxyUrl(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ExperienceGuideTab({ details }) {
  const [activeTab, setActiveTab] = useState('categories');
  // Owned local state — initialised from prop on mount, kept fresh after every save.
  // The prop (details) never re-renders from the parent after mount, so we cannot
  // derive guide display data from it directly; that's the stale-closure bug.
  const [guide, setGuide] = useState(details?.experienceGuide || {});
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    // Receives the complete next experienceGuide object — no merging in mutantFn.
    mutationFn: async (nextGuide) => {
      if (!details?.id) return;
      await base44.entities.WeddingDetails.update(details.id, { experienceGuide: nextGuide });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['guestSuiteDetails']);
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  // Every handler: compute nextGuide → setGuide (immediate UI) → mutate (persist)
  const handleSaveField = (field, value) => {
    const next = { ...guide, [field]: value };
    setGuide(next);
    updateMutation.mutate(next);
  };

  const handleToggleVibe = (vibe) => {
    const vibes = guide.vibes || [];
    const next = { ...guide, vibes: vibes.includes(vibe) ? vibes.filter(v => v !== vibe) : [...vibes, vibe] };
    setGuide(next);
    updateMutation.mutate(next);
  };

  const handleToggleCategory = (catKey) => {
    const cats = guide.categories || {};
    const next = { ...guide, categories: { ...cats, [catKey]: { ...cats[catKey], enabled: !cats[catKey]?.enabled } } };
    setGuide(next);
    updateMutation.mutate(next);
  };

  const handleAddPlace = (place, catKey, note, isCouplePick) => {
    const categories = { ...(guide.categories || {}) };
    const catPlaces = [...(categories[catKey]?.places || [])];

    if (catPlaces.find(p => p.place_id === place.place_id)) {
      toast.error('Already added to this category');
      return;
    }

    const saved = {
      place_id: place.place_id,
      name: place.name,
      address: place.address,
      rating: place.rating,
      price_level: place.price_level,
      photo_ref: place.photo_reference || place.photo_ref || null,
      maps_url: place.maps_url,
      website_url: place.website_url || null,
      note: note || '',
      is_couple_pick: isCouplePick,
    };

    categories[catKey] = { ...(categories[catKey] || {}), places: [...catPlaces, saved] };

    let couplePicks = [...(guide.couplePicks || [])];
    if (isCouplePick && !couplePicks.find(p => p.place_id === place.place_id)) {
      couplePicks = [...couplePicks, { ...saved, category: CATEGORIES.find(c => c.key === catKey)?.label || catKey }];
    }

    const next = { ...guide, categories, couplePicks };
    setGuide(next);
    updateMutation.mutate(next);
    toast.success(`Added to ${CATEGORIES.find(c => c.key === catKey)?.label}`);
  };

  const handleRemovePlace = (catKey, placeId) => {
    const categories = { ...(guide.categories || {}) };
    categories[catKey] = {
      ...(categories[catKey] || {}),
      places: (categories[catKey]?.places || []).filter(p => p.place_id !== placeId),
    };
    const couplePicks = (guide.couplePicks || []).filter(p => p.place_id !== placeId);
    const next = { ...guide, categories, couplePicks };
    setGuide(next);
    updateMutation.mutate(next);
  };

  const handleGenerateIntro = async () => {
    const destination =
      guide.destination ||
      details?.mainCeremony?.address?.split(',').slice(-3).join(', ') ||
      'our destination';
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a 2-3 sentence editorial introduction for a wedding guest guide to ${destination}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic.`,
    });
    const next = { ...guide, editorialIntro: response };
    setGuide(next);
    updateMutation.mutate(next);
  };

  const handleSaveItinerary = useCallback((itinerary) => {
    setGuide(prev => {
      const next = { ...prev, itinerary };
      updateMutation.mutate(next);
      return next;
    });
  }, [updateMutation]);

  const destination =
    guide.destination ||
    details?.mainCeremony?.address?.split(',').slice(-3).join(', ') ||
    'Set your venue in Event Details';

  const allSavedPlaces = CATEGORIES.flatMap(cat =>
    (guide.categories?.[cat.key]?.places || []).map(p => ({ ...p, categoryKey: cat.key, categoryLabel: cat.label }))
  );

  return (
    <div style={{ background: '#FFFFFF' }}>
      <div
        className="flex items-center justify-between gap-4 px-4 md:px-8"
        style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', paddingTop: 10, paddingBottom: 10 }}
      >
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            Experience guide
          </h2>
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            Curate local recommendations for your guests
          </span>
        </div>
      </div>

      <div style={{ padding: '32px 32px 48px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-8">
            <CategoriesTab guide={guide} onToggleCategory={handleToggleCategory} />
          </TabsContent>

          <TabsContent value="places" className="mt-8">
            <PlacesTab
              details={details}
              destination={destination}
              allSavedPlaces={allSavedPlaces}
              onAddPlace={handleAddPlace}
              onRemovePlace={handleRemovePlace}
            />
          </TabsContent>

          <TabsContent value="itinerary" className="mt-8">
            <ItineraryTab
              details={details}
              guide={guide}
              destination={destination}
              allSavedPlaces={allSavedPlaces}
              onSave={handleSaveItinerary}
            />
          </TabsContent>

          <TabsContent value="publish" className="mt-8">
            <PublishTab
              details={details}
              guide={guide}
              destination={destination}
              onSaveField={handleSaveField}
              onGenerateIntro={handleGenerateIntro}
              onToggleVibe={handleToggleVibe}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── Categories tab ─────────────────────────────────────────────────────────────

function CategoriesTab({ guide, onToggleCategory }) {
  return (
    <div>
      <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 28px', lineHeight: 1.6, maxWidth: 560 }}>
        Toggle which sections appear in your guest guide.
      </p>
      <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)' }}>
        {CATEGORIES.map(cat => {
          const isEnabled = guide.categories?.[cat.key]?.enabled !== false;
          const count = guide.categories?.[cat.key]?.places?.length || 0;
          return (
            <div
              key={cat.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(10,10,10,0.06)', gap: 16 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS }}>{cat.label}</span>
                  {count > 0 && (
                    <span className="filter-pill" style={{ cursor: 'default', pointerEvents: 'none' }}>
                      {count} {count === 1 ? 'place' : 'places'}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>{cat.desc}</p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={() => onToggleCategory(cat.key)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Places tab ─────────────────────────────────────────────────────────────────

function PlacesTab({ details, destination, allSavedPlaces, onAddPlace, onRemovePlace }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].key);
  const [note, setNote] = useState('');
  const [isCouplePick, setIsCouplePick] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const debounceRef = useRef(null);

  // Geolocation — transient bias only, never persisted
  const [geoState, setGeoState] = useState('idle'); // idle | loading | active | error | unavailable
  const geoCoordsRef = useRef(null);

  // Manual entry
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualCat, setManualCat] = useState(CATEGORIES[0].key);
  const [manualCouplePick, setManualCouplePick] = useState(false);

  const handleSearch = async (q) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const loc = destination !== 'Set your venue in Event Details' ? destination : '';
      const body = { q: q.trim(), location: loc };
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
    debounceRef.current = setTimeout(() => handleSearch(v), 400);
  };

  const handleSelectResult = (place) => {
    setSelectedPlace(place);
    setQuery(place.name);
    setShowDropdown(false);
    setResults([]);
    setShowManual(false);
  };

  const handleAdd = () => {
    if (!selectedPlace) { toast.error('Search for and select a place first'); return; }
    onAddPlace(selectedPlace, selectedCat, note, isCouplePick);
    setSelectedPlace(null); setQuery(''); setNote(''); setIsCouplePick(false);
  };

  const handleManualAdd = () => {
    if (!manualName.trim()) { toast.error('Name is required'); return; }
    const manualPlace = {
      place_id: uid(),
      name: manualName.trim(),
      address: manualAddress.trim() || '',
      rating: null, price_level: null, photo_reference: null,
      maps_url: manualAddress.trim()
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(manualAddress.trim())}`
        : null,
      website_url: manualUrl.trim() || null,
    };
    onAddPlace(manualPlace, manualCat, manualNote, manualCouplePick);
    setManualName(''); setManualAddress(''); setManualUrl(''); setManualNote('');
    setManualCat(CATEGORIES[0].key); setManualCouplePick(false); setShowManual(false);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) { setGeoState('unavailable'); return; }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => { geoCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setGeoState('active'); },
      err => { console.warn('[Geolocation]', err.message); setGeoState('error'); },
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  const clearGeo = () => { geoCoordsRef.current = null; setGeoState('idle'); };

  const visiblePlaces = filterCat === 'all'
    ? allSavedPlaces
    : allSavedPlaces.filter(p => p.categoryKey === filterCat);

  return (
    <div>
      {/* Add a place card */}
      <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, padding: '20px 24px', marginBottom: 40, maxWidth: 760 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px' }}>Add a place</p>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Search Google Places</span>
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
              placeholder="e.g. rooftop bar, ramen…" style={{ paddingLeft: 20 }} />
            {searching && <Loader2 size={13} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#E03553', animation: 'spin 0.8s linear infinite' }} />}
            {selectedPlace && !searching && (
              <button type="button" onClick={() => { setSelectedPlace(null); setQuery(''); setNote(''); setIsCouplePick(false); }}
                style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {showDropdown && results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, marginTop: 4, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', maxHeight: 320, overflowY: 'auto' }}>
              {results.map((place, i) => (
                <button key={place.place_id} onClick={() => handleSelectResult(place)}
                  style={{ width: '100%', display: 'flex', gap: 10, padding: '10px 12px', alignItems: 'center', background: '#FFFFFF', border: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {place.photo_reference ? (
                    <img src={photoProxyUrl(place.photo_reference, 60)} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={12} color="rgba(10,10,10,0.2)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{place.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</p>
                  </div>
                  {place.rating && (
                    <span style={{ fontSize: 11, color: '#0A0A0A', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      <Star size={9} fill="#E03553" color="#E03553" /> {place.rating}
                    </span>
                  )}
                </button>
              ))}
              <button onClick={() => setShowDropdown(false)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(10,10,10,0.02)', border: 'none', borderTop: '1px solid rgba(10,10,10,0.06)', cursor: 'pointer', fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                Close
              </button>
            </div>
          )}
        </div>

        {/* Add manually toggle — hidden when a place is selected */}
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
                <Input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. Uncle Billy's Bakehouse" />
              </div>
              <div>
                <label style={sectionLabel}>Category</label>
                <select value={manualCat} onChange={e => setManualCat(e.target.value)}
                  style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', outline: 'none', cursor: 'pointer' }}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={sectionLabel}>Address <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <Input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="e.g. 12 Crown St, Sydney NSW" />
              </div>
              <div>
                <label style={sectionLabel}>Link <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional — website, booking…)</span></label>
                <Input value={manualUrl} onChange={e => setManualUrl(e.target.value)} placeholder="https://…" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <Input value={manualNote} onChange={e => setManualNote(e.target.value)} placeholder="e.g. Go for the sourdough, it's worth the queue" />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>Couple's pick</span>
                <Switch checked={manualCouplePick} onCheckedChange={setManualCouplePick} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleManualAdd} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                <Plus size={14} /> Add place
              </button>
            </div>
          </div>
        )}

        {/* Selected place — category/note/couple's pick/confirm all co-located */}
        {selectedPlace && (
          <div style={{ marginTop: 16, border: '1px solid rgba(224,53,83,0.18)', borderRadius: 6, overflow: 'hidden' }}>
            {/* Place header row */}
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.1)' }}>
              {selectedPlace.photo_reference ? (
                <img src={photoProxyUrl(selectedPlace.photo_reference, 80)} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} color="rgba(10,10,10,0.2)" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{selectedPlace.name}</p>
                {selectedPlace.address && <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPlace.address}</p>}
              </div>
              {selectedPlace.rating && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0A0A0A', fontFamily: PJS, flexShrink: 0 }}>
                  <Star size={10} fill="#E03553" color="#E03553" /> {selectedPlace.rating}
                </span>
              )}
              <button type="button" onClick={() => { setSelectedPlace(null); setQuery(''); setNote(''); setIsCouplePick(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            </div>

            {/* Category + note + couple's pick + confirm */}
            <div style={{ padding: '14px 14px 16px', background: '#FFF' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: 14 }}>
                <div>
                  <label style={sectionLabel}>Category</label>
                  <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.2)', padding: '10px 0', fontSize: 13, fontFamily: PJS, color: '#0A0A0A', outline: 'none', cursor: 'pointer' }}>
                    {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={sectionLabel}>Note for guests <span style={{ fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                  <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Ask for the corner table…" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>Couple's pick</span>
                  <Switch checked={isCouplePick} onCheckedChange={setIsCouplePick} />
                </div>
                <button type="button" onClick={handleAdd} className="btn-primary" style={{ fontSize: 13, padding: '8px 20px' }}>
                  <Plus size={14} /> Add place
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Saved places grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <label style={{ ...sectionLabel, marginBottom: 2 }}>Saved places</label>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
              {allSavedPlaces.length} total across all categories
            </p>
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', color: '#0A0A0A', outline: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            <option value="all">All categories ({allSavedPlaces.length})</option>
            {CATEGORIES.map(c => {
              const n = allSavedPlaces.filter(p => p.categoryKey === c.key).length;
              return n > 0 ? <option key={c.key} value={c.key}>{c.label} ({n})</option> : null;
            })}
          </select>
        </div>

        {visiblePlaces.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, margin: 0 }}>
              {allSavedPlaces.length === 0
                ? 'Search above and click "Add place" to start building your guide.'
                : 'No places in this category yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {visiblePlaces.map(place => (
              <SavedPlaceCard
                key={`${place.categoryKey}-${place.place_id}`}
                place={place}
                onRemove={() => onRemovePlace(place.categoryKey, place.place_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SavedPlaceCard({ place, onRemove }) {
  const [hovered, setHovered] = useState(false);
  const photo = photoProxyUrl(place.photo_ref, 600);

  return (
    <div
      style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FFFFFF', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Photo */}
      <div style={{ height: 160, background: '#F5F5F5', position: 'relative', overflow: 'hidden' }}>
        {photo ? (
          <img src={photo} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={24} color="rgba(10,10,10,0.12)" />
          </div>
        )}

        {/* Couple's pick badge */}
        {place.is_couple_pick && (
          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#E03553', borderRadius: 999 }}>
            <Heart size={9} fill="#FFFFFF" color="#FFFFFF" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>Couple's pick</span>
          </div>
        )}

        {/* Remove button — visible on hover */}
        {hovered && (
          <button
            onClick={onRemove}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Remove place"
          >
            <X size={13} color="#FFFFFF" />
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS, lineHeight: 1.3 }}>{place.name}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {/* Category badge */}
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
            {place.categoryLabel}
          </span>
          {place.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#0A0A0A', fontFamily: PJS }}>
              <Star size={10} fill="#E03553" color="#E03553" /> {place.rating}
            </span>
          )}
          {place.price_level > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>{'$'.repeat(place.price_level)}</span>
          )}
        </div>

        {place.note && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', margin: '0 0 6px', fontFamily: PJS, fontStyle: 'italic', lineHeight: 1.4 }}>
            "{place.note}"
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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

// ── Itinerary tab ──────────────────────────────────────────────────────────────

async function fetchPhotoForActivity(name, destination) {
  try {
    const loc = destination && destination !== 'Set your venue in Event Details' ? destination : '';
    const params = new URLSearchParams({ q: name });
    if (loc) params.set('location', loc);
    const res = await fetch(`/api/places?${params}`);
    const data = await res.json();
    const ref = data.places?.[0]?.photo_reference;
    return ref ? `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=800` : null;
  } catch {
    return null;
  }
}

async function enrichScheduleWithPhotos(schedule, allSavedPlaces, destination) {
  return Promise.all(schedule.map(async (day) => {
    const blocks = {};
    for (const block of ['morning', 'afternoon', 'evening']) {
      blocks[block] = await Promise.all((day.blocks[block] || []).map(async (act) => {
        if (act.photo_url) return act;
        if (act.type === 'place' && act.place_id) {
          const sp = allSavedPlaces.find(p => p.place_id === act.place_id);
          if (sp?.photo_ref) {
            return { ...act, photo_url: `/api/places-photo?ref=${encodeURIComponent(sp.photo_ref)}&maxwidth=800` };
          }
        }
        const name = act.place_name || act.custom_text || '';
        if (name) {
          const url = await fetchPhotoForActivity(name, destination);
          if (url) return { ...act, photo_url: url };
        }
        return act;
      }));
    }
    return { ...day, blocks };
  }));
}

function ItineraryTab({ details, guide, destination, allSavedPlaces, onSave }) {
  const itinerary = guide.itinerary || { days: 3, schedule: [] };
  const [days, setDays] = useState(itinerary.days || 3);
  const [schedule, setSchedule] = useState(() => buildSchedule(itinerary.days || 3, itinerary.schedule || []));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  function buildSchedule(numDays, existing) {
    return Array.from({ length: numDays }, (_, i) => {
      const ex = existing.find(d => d.day === i + 1) || {};
      return {
        day: i + 1,
        title: ex.title || `Day ${i + 1}`,
        summary: ex.summary || '',
        blocks: {
          morning:   ex.blocks?.morning   || [],
          afternoon: ex.blocks?.afternoon || [],
          evening:   ex.blocks?.evening   || [],
        },
      };
    });
  }

  const handleLengthChange = (n) => {
    setDays(n);
    setSchedule(prev => buildSchedule(n, prev));
  };

  const handleDayTitleChange = (dayIdx, title) => {
    setSchedule(prev => prev.map((d, i) => i === dayIdx ? { ...d, title } : d));
  };

  const handleAddActivity = (dayIdx, block, activity) => {
    setSchedule(prev => prev.map((d, i) => i === dayIdx ? {
      ...d, blocks: { ...d.blocks, [block]: [...d.blocks[block], { ...activity, id: uid() }] },
    } : d));
  };

  const handleRemoveActivity = (dayIdx, block, activityId) => {
    setSchedule(prev => prev.map((d, i) => i === dayIdx ? {
      ...d, blocks: { ...d.blocks, [block]: d.blocks[block].filter(a => a.id !== activityId) },
    } : d));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ days, schedule });
    setSaving(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const placesSummary = allSavedPlaces.map(p => ({
        place_id: p.place_id, name: p.name, category: p.categoryLabel,
      }));

      const dayContext = days >= 3
        ? `Day 1 = arrival/settling in and exploring the local area. Middle days = deeper exploration, food, activities. Last day = relaxed farewell morning.`
        : days === 1
        ? `Single day: pack in highlights — morning coffee spot, afternoon sightseeing, evening dinner.`
        : `Two days: Day 1 = arrival and orientation; Day 2 = deeper exploration.`;

      const prompt = `You are planning a premium ${days}-day wedding destination itinerary for guests visiting ${destination}. ${dayContext}

Curated places the couple has saved (use as many as fit naturally):
${JSON.stringify(placesSummary)}

Return ONLY valid JSON — no markdown fences, no explanation:
{
  "schedule": [
    {
      "day": 1,
      "title": "Evocative short day title",
      "summary": "One sentence capturing the day's mood and theme",
      "blocks": {
        "morning": [
          {
            "type": "place",
            "place_id": "exact_place_id_from_list",
            "place_name": "Place name",
            "category": "Category label",
            "time": "9:00 AM",
            "duration": "~1.5 hrs",
            "description": "1-2 vivid sentences: what to do, why it's special, one insider tip."
          }
        ],
        "afternoon": [ ... ],
        "evening": [ ... ]
      }
    }
  ]
}

Rules:
- 2-3 activities per time block, flowing logically
- Mix food, sightseeing, experiences, and downtime
- For saved places: use type "place" with exact place_id; omit place_id for custom
- For custom/filler activities: use type "custom", place_name = activity title, no place_id
- Times must flow (morning before afternoon, etc.)
- Descriptions must be warm, specific, and helpful — like a well-travelled local friend
- Durations where natural (e.g. "~2 hrs", "~45 min", "all evening")
- Day titles: evocative, not generic ("Harbour mornings & harbour nights" not "Day 1: Explore")`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.schedule?.length) throw new Error('Empty schedule');

      const rawSchedule = parsed.schedule.slice(0, days).map((d, i) => ({
        day: i + 1,
        title: d.title || `Day ${i + 1}`,
        summary: d.summary || '',
        blocks: {
          morning:   (d.blocks?.morning   || []).map(a => ({ ...a, id: uid() })),
          afternoon: (d.blocks?.afternoon || []).map(a => ({ ...a, id: uid() })),
          evening:   (d.blocks?.evening   || []).map(a => ({ ...a, id: uid() })),
        },
      }));

      toast('Fetching photos…', { icon: '🖼️', duration: 2000 });
      const enriched = await enrichScheduleWithPhotos(rawSchedule, allSavedPlaces, destination);
      setSchedule(enriched);
      toast.success('Itinerary ready — review and save');
    } catch (err) {
      console.error('[Ava itinerary]', err);
      toast.error('Generation failed — try again');
    }
    setGenerating(false);
  };

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        {/* Day length selector */}
        <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, overflow: 'hidden' }}>
          {ITINERARY_LENGTHS.map(n => (
            <button
              key={n}
              onClick={() => handleLengthChange(n)}
              style={{
                padding: '7px 16px', background: days === n ? '#0A0A0A' : '#FFFFFF',
                color: days === n ? '#FFFFFF' : 'rgba(10,10,10,0.6)',
                border: 'none', borderRight: n !== 5 ? '1px solid rgba(10,10,10,0.12)' : 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: PJS,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {n} {n === 1 ? 'day' : 'days'}
            </button>
          ))}
        </div>

        {generating ? (
          <button
            disabled
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 999, padding: '7px 14px',
              background: 'linear-gradient(135deg, #ec4899, #9333ea)',
              color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: PJS,
              border: 'none', opacity: 0.7,
            }}
          >
            <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
            Ava is planning…
          </button>
        ) : (
          <AvaButton label="Ask Ava to plan an itinerary" onClick={handleGenerate} />
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save itinerary'}
        </button>
      </div>

      {allSavedPlaces.length === 0 && (
        <div style={{ padding: '12px 16px', background: 'rgba(10,10,10,0.03)', borderRadius: 6, marginBottom: 24, border: '1px solid rgba(10,10,10,0.06)' }}>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0 }}>
            Tip: Add places in the Places tab first — Ava will use them to build a personalised itinerary.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {schedule.map((day, dayIdx) => (
          <DayCard
            key={day.day}
            day={day}
            allSavedPlaces={allSavedPlaces}
            onTitleChange={t => handleDayTitleChange(dayIdx, t)}
            onAddActivity={(block, act) => handleAddActivity(dayIdx, block, act)}
            onRemoveActivity={(block, id) => handleRemoveActivity(dayIdx, block, id)}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({ day, allSavedPlaces, onTitleChange, onAddActivity, onRemoveActivity }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(day.title);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS, whiteSpace: 'nowrap' }}>
            Day {day.day}
          </span>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={() => { onTitleChange(titleDraft); setEditingTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onTitleChange(titleDraft); setEditingTitle(false); } }}
              style={{ flex: 1, border: 'none', borderBottom: '1px solid #E03553', background: 'transparent', fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '2px 0' }}
            />
          ) : (
            <button
              onClick={() => setEditingTitle(true)}
              style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'text', padding: 0 }}
            >
              {day.title || `Day ${day.day}`}
            </button>
          )}
        </div>
        {day.summary && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '4px 0 0', fontStyle: 'italic' }}>
            {day.summary}
          </p>
        )}
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        {TIME_BLOCKS.map((block, bi) => (
          <div key={block} style={{ paddingTop: 16, borderTop: bi > 0 ? '1px solid rgba(10,10,10,0.04)' : 'none', marginTop: bi > 0 ? 16 : 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} /> {block.charAt(0).toUpperCase() + block.slice(1)}
            </p>
            {day.blocks[block].map(activity => (
              <ActivityRow key={activity.id} activity={activity} onRemove={() => onRemoveActivity(block, activity.id)} />
            ))}
            <AddActivityInline block={block} allSavedPlaces={allSavedPlaces} onAdd={act => onAddActivity(block, act)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ activity, onRemove }) {
  const name = activity.place_name || activity.custom_text || '';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(10,10,10,0.04)' }}>
      {/* Thumbnail */}
      <div style={{ width: 56, height: 56, flexShrink: 0, overflow: 'hidden', borderRadius: 4, background: 'rgba(10,10,10,0.04)' }}>
        {activity.photo_url ? (
          <img src={activity.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={14} color="rgba(10,10,10,0.2)" />
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>{name}</p>
          {activity.time && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>{activity.time}</span>}
          {activity.duration && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>{activity.duration}</span>}
        </div>
        {activity.category && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.5)', fontFamily: PJS, display: 'inline-block', marginBottom: 4 }}>
            {activity.category}
          </span>
        )}
        {activity.description && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.55)', margin: 0, fontFamily: PJS, lineHeight: 1.5 }}>{activity.description}</p>
        )}
        {!activity.description && (activity.note) && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS, fontStyle: 'italic' }}>{activity.note}</p>
        )}
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.25)', padding: 0, flexShrink: 0, marginTop: 2 }}>
        <X size={13} />
      </button>
    </div>
  );
}

function AddActivityInline({ block, allSavedPlaces, onAdd }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('place');
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [customText, setCustomText] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (type === 'place') {
      const place = allSavedPlaces.find(p => p.place_id === selectedPlaceId);
      if (!place) { toast.error('Select a place'); return; }
      onAdd({ type: 'place', place_id: place.place_id, place_name: place.name, category: place.categoryLabel, note,
        photo_url: place.photo_ref ? `/api/places-photo?ref=${encodeURIComponent(place.photo_ref)}&maxwidth=800` : null });
    } else {
      if (!customText.trim()) { toast.error('Enter an activity'); return; }
      onAdd({ type: 'custom', place_name: customText.trim(), note });
    }
    setOpen(false);
    setSelectedPlaceId('');
    setCustomText('');
    setNote('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', fontWeight: 600 }}
      >
        <Plus size={12} /> Add activity
      </button>
    );
  }

  return (
    <div style={{ padding: '10px 12px', background: 'rgba(10,10,10,0.02)', borderRadius: 6, marginTop: 6, border: '1px solid rgba(10,10,10,0.06)' }}>
      <div style={{ display: 'flex', gap: 0, marginBottom: 10, border: '1px solid rgba(10,10,10,0.1)', borderRadius: 4, overflow: 'hidden', width: 'fit-content' }}>
        {[['place', 'From saved places'], ['custom', 'Custom activity']].map(([val, label]) => (
          <button key={val} onClick={() => setType(val)} style={{
            padding: '5px 12px', border: 'none', fontSize: 11, fontWeight: 600, fontFamily: PJS, cursor: 'pointer',
            background: type === val ? '#0A0A0A' : '#FFFFFF', color: type === val ? '#FFFFFF' : 'rgba(10,10,10,0.5)',
            borderRight: val === 'place' ? '1px solid rgba(10,10,10,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>
      {type === 'place' ? (
        <select value={selectedPlaceId} onChange={e => setSelectedPlaceId(e.target.value)}
          style={{ width: '100%', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, fontFamily: PJS, color: '#0A0A0A', background: '#FFF', outline: 'none', marginBottom: 8 }}>
          <option value="">Select a saved place…</option>
          {CATEGORIES.map(cat => {
            const cp = allSavedPlaces.filter(p => p.categoryKey === cat.key);
            return cp.length ? <optgroup key={cat.key} label={cat.label}>{cp.map(p => <option key={p.place_id} value={p.place_id}>{p.name}</option>)}</optgroup> : null;
          })}
        </select>
      ) : (
        <input value={customText} onChange={e => setCustomText(e.target.value)}
          placeholder="e.g. Check in to hotel, Welcome BBQ at the venue…"
          style={{ width: '100%', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, fontFamily: PJS, color: '#0A0A0A', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
      )}
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional tip for guests…"
        style={{ width: '100%', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, fontFamily: PJS, color: '#0A0A0A', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleAdd} className="btn-primary" style={{ fontSize: 11, padding: '5px 14px' }}>Add</button>
        <button onClick={() => setOpen(false)} className="btn-editorial-secondary" style={{ fontSize: 11, padding: '5px 14px' }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Publish tab (includes Setup fields) ───────────────────────────────────────

function PublishTab({ details, guide, destination, onSaveField, onGenerateIntro, onToggleVibe }) {
  const isPublished = guide.published;

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Presentation fields */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS }}>Guide presentation</p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: '0 0 24px', fontFamily: PJS }}>Optional fields shown when the guide is published.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px 32px', marginBottom: 24 }}>
          <div>
            <label style={sectionLabel}>Hero photo URL</label>
            <Input
              type="text"
              value={guide.heroPhotoUrl || ''}
              onChange={e => onSaveField('heroPhotoUrl', e.target.value)}
              placeholder="https://..."
            />
            <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '6px 0 0' }}>Full-screen banner on the guest-facing guide.</p>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ ...sectionLabel, marginBottom: 0 }}>Editorial intro</label>
            <button onClick={onGenerateIntro} className="btn-editorial-secondary" style={{ fontSize: 11, padding: '4px 10px' }}>
              ✦ Generate with AI
            </button>
          </div>
          <textarea
            value={guide.editorialIntro || ''}
            onChange={e => onSaveField('editorialIntro', e.target.value)}
            rows={3}
            placeholder="Write an inspiring introduction to your wedding destination…"
            style={{ width: '100%', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 6, padding: '10px 12px', fontSize: 14, fontFamily: PJS, color: '#0A0A0A', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            onFocus={e => { e.target.style.borderColor = '#E03553'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(10,10,10,0.15)'; }}
          />
        </div>

        <div>
          <label style={sectionLabel}>Destination vibes</label>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: '0 0 10px' }}>
            Shown as tags on the guest guide hero.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {VIBE_OPTIONS.map(vibe => {
              const active = (guide.vibes || []).includes(vibe);
              return (
                <button key={vibe} onClick={() => onToggleVibe(vibe)} className={`filter-pill${active ? ' active' : ''}`}>
                  {vibe}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Publish toggle */}
      <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: 28 }}>
        {!isPublished ? (
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Globe size={22} color="rgba(10,10,10,0.3)" strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: '#0A0A0A', margin: '0 0 8px', fontFamily: PJS }}>
              Your guide is hidden
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '0 0 24px', fontFamily: PJS, lineHeight: 1.6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
              When published, a "Guide" link appears in your wedding website navigation.
            </p>
            <button onClick={() => onSaveField('published', true)} className="btn-primary" style={{ fontSize: 14, padding: '10px 28px' }}>
              Publish guide
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>Guide is live</p>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.45)', margin: 0, fontFamily: PJS }}>
                Guests can access this from your wedding website navigation.
              </p>
            </div>
            <Switch checked={true} onCheckedChange={v => onSaveField('published', v)} />
          </div>
        )}
      </div>
    </div>
  );
}
