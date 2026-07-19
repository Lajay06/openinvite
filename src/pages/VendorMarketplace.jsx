import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, ChevronDown, Loader2, LocateFixed, Building2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import VendorCard from '@/components/marketplace/VendorCard';
import VendorProfileModal from '@/components/marketplace/VendorProfileModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

const CATEGORIES = [
  'All','Photography','Videography','Catering','Florals',
  'Styling','Hair & makeup','Music & DJ','Entertainment',
  'Venues','Transport','Celebrant','Stationery','Cake','Jewellery','Other',
];

const PRICE_LABELS = { '$': 'Budget', '$$': 'Mid-range', '$$$': 'Premium', '$$$$': 'Luxury' };
const PRICE_MAP = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const PRICE_ORDER = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
const SORT_OPTIONS = ['Relevance', 'Rating', 'Price low–high', 'Price high–low'];

// Categories that can plausibly serve any location remotely — Google Places
// has no "works online" attribute (it's an inherently location-anchored
// directory of physical places), so "Online services" can't filter to real
// online-only vendors. Honest v1: for these categories only, checking it
// drops the location constraint from the search entirely instead of
// pretending to know which specific results are remote-capable.
const REMOTE_PLAUSIBLE_CATEGORIES = ['Celebrant', 'Styling', 'Stationery', 'Entertainment'];

const CATEGORY_QUERIES = {
  'Photography':   'wedding photographer',
  'Videography':   'wedding videographer filmmaker',
  'Catering':      'wedding catering caterer',
  'Florals':       'wedding florist',
  'Styling':       'wedding stylist event planner',
  'Hair & makeup': 'bridal hair makeup artist',
  'Music & DJ':    'wedding DJ band music',
  'Entertainment': 'wedding entertainment performer',
  'Venues':        'wedding venue function centre',
  'Transport':     'wedding car hire chauffeur',
  'Celebrant':     'wedding celebrant officiant',
  'Stationery':    'wedding stationery invitations',
  'Cake':          'wedding cake bakery',
  'Jewellery':     'engagement ring jewellery',
  'Other':         'wedding vendor',
};

// Real Google Places data only — /api/places-search (text search) + /api/place-details
// (profile view) + /api/places-photo (thumbnails), all server-side proxies keeping
// GOOGLE_PLACES_API_KEY off the browser. No sample/fallback data: an unconfigured key
// or a failed request shows an honest error, never invented vendors.

export default function VendorMarketplace() {
  const [search, setSearch] = useState('');
  const [locationQ, setLocationQ] = useState('');
  const [category, setCategory] = useState('All');
  const [minRating, setMinRating] = useState(false);
  const [priceFilter, setPriceFilter] = useState('');
  const [sortBy, setSortBy] = useState('Relevance');
  const [selectedVendor, setSelectedVendor] = useState(null);

  // "Use my location" — device coordinates, passed straight through to
  // /api/places-search's existing lat/lng branch (no reverse-geocoding: this
  // app has no reverse-geocode endpoint, so coordinates never become a typed
  // address; the input shows a small chip instead while active).
  const [geoCoords, setGeoCoords] = useState(null); // { lat, lng } | null
  const [geoStatus, setGeoStatus] = useState('');   // '' | 'locating'
  const [geoMessage, setGeoMessage] = useState(''); // denied/unavailable, shown inline

  // "Use event location" — the wedding's ceremony venue (Event details),
  // fed through the same location string param the input already uses.
  const [eventLocation, setEventLocation] = useState(null); // string | null

  // "Online services" — see REMOTE_PLAUSIBLE_CATEGORIES above.
  const [onlineServices, setOnlineServices] = useState(false);
  const [resultsOnlineActive, setResultsOnlineActive] = useState(false); // reflects the last completed search, not the live checkbox
  const [profileOpen, setProfileOpen] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingIds, setSavingIds] = useState(new Set());
  const [vendors, setVendors] = useState(null);
  const [apiStatus, setApiStatus] = useState(''); // '' | 'searching' | 'done' | 'error'

  // Load the wedding's ceremony venue once, for "Use event location". Uses
  // the MAIN ceremony specifically when both a ceremony and reception venue
  // exist (per mainCeremony/reception on WeddingDetails, set in Event
  // details) — address is more precise for a Places location bias than the
  // bare venue name, falling back to the name if no address was captured.
  useEffect(() => {
    getMyWeddingDetails().then(wd => {
      const mc = wd?.mainCeremony || {};
      setEventLocation(mc.address || mc.venueName || null);
    }).catch(() => setEventLocation(null));
  }, []);

  const handleSave = async (vendor) => {
    if (savedIds.has(vendor.id)) return;
    setSavingIds(prev => new Set([...prev, vendor.id]));
    try {
      await base44.entities.Vendor.create({
        name: vendor.name,
        category: vendor.category.toLowerCase(),
        website: vendor.website || '',
        notes: vendor.location,
        status: 'researching',
      });
      setSavedIds(prev => new Set([...prev, vendor.id]));
      toast.success('Saved to My vendors');
    } catch {
      toast.error('Failed to save vendor');
    }
    setSavingIds(prev => { const s = new Set(prev); s.delete(vendor.id); return s; });
  };

  const handleViewProfile = (vendor) => { setSelectedVendor(vendor); setProfileOpen(true); };

  // Core search, parameterised so the two location buttons can apply their
  // own location immediately without waiting on a state update to land
  // (setLocationQ/setGeoCoords are async — reading the state back in the
  // same tick would still see the old value).
  const runSearch = async ({ coordsOverride, locationOverride } = {}) => {
    setApiStatus('searching');

    const rawSearch = search.trim();
    // Only use category keywords when there is no typed text — never combine both
    // (mixing them over-constrains Text Search and drops exact name matches)
    const categoryQuery = (!rawSearch && category !== 'All') ? (CATEGORY_QUERIES[category] || 'wedding vendor') : null;
    const q = rawSearch || categoryQuery || 'wedding vendor';

    const coords = coordsOverride !== undefined ? coordsOverride : geoCoords;
    const loc = (locationOverride !== undefined ? locationOverride : locationQ).trim();
    const onlineActive = onlineServices && REMOTE_PLAUSIBLE_CATEGORIES.includes(category);

    const body = { q };
    if (onlineActive) {
      // Honest widening, not a fake "online" filter: Places has no such
      // attribute, so the only real lever is to drop the location bias
      // entirely for categories that plausibly work remotely.
    } else if (coords) {
      body.lat = coords.lat;
      body.lng = coords.lng;
    } else if (loc) {
      body.location = loc;
    }

    try {
      const res = await fetch('/api/places-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setApiStatus('error');
        setVendors(null);
        return;
      }
      const data = await res.json();
      const mapped = (data.places || []).map(p => ({
        id: p.place_id,
        placeId: p.place_id,
        name: p.name,
        category: category !== 'All' ? category : 'Other',
        rating: p.rating,
        reviewCount: p.user_ratings_total || 0,
        location: p.address || '',
        priceRange: p.price_level != null ? (PRICE_MAP[p.price_level] || '') : '',
        photoReference: p.photo_reference || null,
        mapsUrl: p.maps_url || null,
        website: null,
        phone: null,
      }));
      setVendors(mapped);
      setResultsOnlineActive(onlineActive);
      setApiStatus('done');
    } catch {
      setApiStatus('error');
      setVendors(null);
    }
  };

  const handleSearch = () => runSearch();

  // "Use my location" — the three real Geolocation outcomes, handled
  // honestly: granted runs the search immediately; denied/unavailable show
  // a small inline message and leave the location input fully usable (no
  // toast spam).
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('Location is not available in this browser — type a location instead.');
      return;
    }
    setGeoStatus('locating');
    setGeoMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoCoords(coords);
        setGeoStatus('');
        setGeoMessage('');
        runSearch({ coordsOverride: coords });
      },
      (err) => {
        setGeoStatus('');
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied — type a location instead.'
            : 'Could not get your location — type a location instead.'
        );
      },
      { timeout: 8000 }
    );
  };

  // "Use event location" — the wedding's ceremony venue, applied like any
  // other typed location (same location string param, no coordinates).
  const handleUseEventLocation = () => {
    if (!eventLocation) return;
    setGeoCoords(null);
    setGeoMessage('');
    setLocationQ(eventLocation);
    runSearch({ coordsOverride: null, locationOverride: eventLocation });
  };

  const filtered = useMemo(() => {
    if (!vendors) return [];
    let list = vendors.filter(v => {
      if (minRating && (v.rating || 0) < 4) return false;
      if (priceFilter && v.priceRange !== priceFilter) return false;
      return true;
    });
    if (sortBy === 'Rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'Price low–high') list = [...list].sort((a, b) => (PRICE_ORDER[a.priceRange] || 99) - (PRICE_ORDER[b.priceRange] || 99));
    else if (sortBy === 'Price high–low') list = [...list].sort((a, b) => (PRICE_ORDER[b.priceRange] || 0) - (PRICE_ORDER[a.priceRange] || 0));
    return list;
  }, [vendors, minRating, priceFilter, sortBy]);

  const underlineInput = (extraStyle = {}) => ({
    border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
    background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
    outline: 'none', padding: '8px 0', boxSizing: 'border-box',
    ...extraStyle,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Marketplace" subtitle="Find and connect with real wedding vendors" />

      {/* Ava button */}
      <div style={{ padding: '16px 32px 0' }}>
        <AvaButton label="Ask Ava to find the perfect vendors" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Filter bar */}
      <div style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Row 1: search + location + search button */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search vendors, categories…"
              style={{ ...underlineInput({ paddingLeft: 20, width: '100%' }) }}
              onFocus={e => e.target.style.borderBottomColor = '#E03553'}
              onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'}
            />
          </div>
          <div style={{ position: 'relative', width: 200 }}>
            {geoCoords ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(10,10,10,0.15)', padding: '8px 0' }}>
                <MapPin size={13} style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#0A0A0A', fontFamily: PJS, flex: 1 }}>Current location</span>
                <button
                  type="button"
                  onClick={() => setGeoCoords(null)}
                  title="Clear current location"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 0, flexShrink: 0 }}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <MapPin size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <input
                  value={locationQ} onChange={e => setLocationQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="City, region or postcode"
                  style={{ ...underlineInput({ paddingLeft: 20, width: '100%' }) }}
                  onFocus={e => e.target.style.borderBottomColor = '#E03553'}
                  onBlur={e => e.target.style.borderBottomColor = 'rgba(10,10,10,0.15)'}
                />
              </>
            )}
          </div>
          <button onClick={handleSearch} disabled={apiStatus === 'searching'}
            style={{ padding: '8px 18px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: apiStatus === 'searching' ? 'not-allowed' : 'pointer', border: 'none', background: '#E03553', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, opacity: apiStatus === 'searching' ? 0.7 : 1 }}>
            {apiStatus === 'searching' ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            Search
          </button>
        </div>

        {/* Row 1.5: location shortcuts — sit with the location input above */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoStatus === 'locating'}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: geoStatus === 'locating' ? 'not-allowed' : 'pointer', border: '1px solid rgba(10,10,10,0.15)', background: 'none', color: '#0A0A0A', opacity: geoStatus === 'locating' ? 0.6 : 1 }}
            >
              {geoStatus === 'locating' ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
              Use my location
            </button>
            <button
              type="button"
              onClick={handleUseEventLocation}
              disabled={!eventLocation}
              title={!eventLocation ? 'Add your venue in Event details to use this' : `Use ${eventLocation}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: eventLocation ? 'pointer' : 'not-allowed', border: '1px solid rgba(10,10,10,0.15)', background: 'none', color: eventLocation ? '#0A0A0A' : 'rgba(10,10,10,0.3)', opacity: eventLocation ? 1 : 0.6 }}
            >
              <Building2 size={12} />
              Use event location
            </button>
          </div>
          {geoMessage && (
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, margin: 0 }}>{geoMessage}</p>
          )}
        </div>

        {/* Row 2: category pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.12s',
                background: category === cat ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
                color: category === cat ? '#FFFFFF' : '#444444' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Row 3: rating toggle + price pills + sort */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingBottom: 4, borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <button onClick={() => setMinRating(v => !v)}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
              borderColor: minRating ? '#F59E0B' : 'rgba(10,10,10,0.15)',
              background: minRating ? 'rgba(245,158,11,0.08)' : 'none',
              color: minRating ? '#92400e' : 'rgba(10,10,10,0.5)' }}>
            4★ and above
          </button>

          {Object.entries(PRICE_LABELS).map(([sym, label]) => (
            <button key={sym} onClick={() => setPriceFilter(f => f === sym ? '' : sym)}
              style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS, cursor: 'pointer', border: '1.5px solid', transition: 'all 0.12s',
                borderColor: priceFilter === sym ? '#0A0A0A' : 'rgba(10,10,10,0.15)',
                background: priceFilter === sym ? '#0A0A0A' : 'none',
                color: priceFilter === sym ? '#FFFFFF' : 'rgba(10,10,10,0.5)' }}>
              {sym} · {label}
            </button>
          ))}

          {/* Online services — only meaningful for categories that can plausibly
              serve any location remotely (see REMOTE_PLAUSIBLE_CATEGORIES).
              Disabled elsewhere rather than silently doing nothing when checked. */}
          {(() => {
            const onlineEnabled = REMOTE_PLAUSIBLE_CATEGORIES.includes(category);
            return (
              <label
                title={!onlineEnabled ? 'Not available for this category' : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: onlineEnabled ? 'pointer' : 'not-allowed', opacity: onlineEnabled ? 1 : 0.45 }}
              >
                <input
                  type="checkbox"
                  checked={onlineServices}
                  disabled={!onlineEnabled}
                  onChange={e => setOnlineServices(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#E03553', cursor: 'inherit' }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: PJS, color: onlineEnabled ? 'rgba(10,10,10,0.55)' : 'rgba(10,10,10,0.35)' }}>
                  Online services
                </span>
              </label>
            );
          })()}

          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ appearance: 'none', border: 'none', background: 'none', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: 'rgba(10,10,10,0.5)', cursor: 'pointer', paddingRight: 18, outline: 'none' }}>
              {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronDown size={11} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.6)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: '8px 32px 48px' }}>
        {apiStatus === 'error' && (
          <div style={{ padding: '10px 14px', background: 'rgba(224,53,83,0.06)', border: '1px solid rgba(224,53,83,0.2)', marginBottom: 12, fontSize: 12, color: '#c42d47', fontFamily: PJS }}>
            Search unavailable right now — please try again shortly.
          </div>
        )}
        {apiStatus === 'done' && vendors !== null && vendors.length > 0 && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 12, fontSize: 12, color: '#065f46', fontFamily: PJS }}>
            Live results from Google Places.
          </div>
        )}
        {apiStatus === 'done' && resultsOnlineActive && (
          <div style={{ padding: '10px 14px', background: 'rgba(10,10,10,0.03)', border: '1px solid rgba(10,10,10,0.1)', marginBottom: 12, fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
            Showing vendors regardless of location — "Online services" is checked for {category}.
          </div>
        )}

        {vendors === null ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
              {apiStatus === 'searching' ? 'Searching Google Places…' : 'Search for wedding vendors by category and location to get started.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, padding: '12px 0', marginBottom: 4 }}>
              {filtered.length} vendor{filtered.length !== 1 ? 's' : ''} found
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                  No vendors found for this search. Try a different category, location, or clear your filters.
                </p>
              </div>
            ) : (
              filtered.map(vendor => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onViewProfile={handleViewProfile}
                  onSave={handleSave}
                  isSaved={savedIds.has(vendor.id)}
                  isSaving={savingIds.has(vendor.id)}
                />
              ))
            )}
          </>
        )}
      </div>

      {profileOpen && selectedVendor && (
        <VendorProfileModal
          vendor={selectedVendor}
          onClose={() => setProfileOpen(false)}
          onSave={handleSave}
          isSaved={savedIds.has(selectedVendor.id)}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Vendor advisor"
        systemPrompt="You are Ava, a wedding vendor expert for Openinvite. Help couples find, evaluate, and manage wedding vendors. Suggest vendor categories to search for, help them understand pricing signals, and prepare questions to ask vendors directly."
        quickActions={['What vendors do I still need?', 'What questions should I ask vendors?', 'Help me compare vendors I have saved']}
      />
    </div>
  );
}
