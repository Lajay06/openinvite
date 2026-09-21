import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ShoppingBag, Plus, Navigation, MapPin, Star, Globe, Phone, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { FilterPills, EmptyState, ErrorState, SkeletonRows, ItemCard, ItemList, PillButton, BottomSheet, SmartImage, Checkbox, SelectField, StatusPill } from '../../ui';
import { useApi } from '../../data/api';
import { openExternal } from '../../native';
import { CATEGORIES, CATEGORY_QUERIES } from '@/lib/vendorPlaces';

/* VendorMarketplace.jsx's maps, verbatim. */
const PRICE_MAP = { 0: '$', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };
const TRUSTED_TYPE_CATEGORY = [['florist', 'Florals'], ['jewelry_store', 'Jewellery'], ['bakery', 'Cake'], ['hair_care', 'Hair & makeup'], ['beauty_salon', 'Hair & makeup'], ['spa', 'Hair & makeup'], ['car_rental', 'Transport'], ['taxi_stand', 'Transport'], ['lodging', 'Venues'], ['restaurant', 'Catering'], ['cafe', 'Catering'], ['bar', 'Catering'], ['meal_delivery', 'Catering'], ['meal_takeaway', 'Catering']];
const REMOTE_PLAUSIBLE = ['Celebrant', 'Styling', 'Stationery', 'Entertainment'];
function categoryFromTypes(types) { if (!Array.isArray(types) || !types.length) return null; const set = new Set(types); for (const [t, l] of TRUSTED_TYPE_CATEGORY) if (set.has(t)) return l; return null; }
const SORTS = [{ value: 'Relevance', label: 'Relevance' }, { value: 'Rating', label: 'Rating' }, { value: 'Reviews', label: 'Most reviews' }];

/**
 * Marketplace, as VendorMarketplace.jsx: free text, category chips,
 * location text, Use my location, Use event location (the ceremony
 * address), Online services, 4+ stars, sort, result cards with Google's
 * photo, rating and reviews, price band and address, a profile sheet from
 * place details (photo, reviews, website, phone, maps), and Add to my
 * vendors through saveVendorFromPlaces. Searches near the venue on open.
 */
export default function MarketplaceScreen({ eventLocation = '', savedIds = new Set(), onSave, back }) {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [locationQ, setLocationQ] = useState('');
  const [coords, setCoords] = useState(null);
  const [geo, setGeo] = useState('');
  const [online, setOnline] = useState(false);
  const [minRating, setMinRating] = useState(false);
  const [sortBy, setSortBy] = useState('Relevance');
  const [vendors, setVendors] = useState(null);
  const [status, setStatus] = useState(''); // '' | searching | done | error
  const [recommended, setRecommended] = useState(false);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(new Set());
  const searched = useRef(false);

  const runSearch = async ({ coordsOverride, locationOverride, categoryOverride, isAuto = false } = {}) => {
    searched.current = true;
    setRecommended(isAuto);
    setStatus('searching');
    const activeCategory = categoryOverride !== undefined ? categoryOverride : category;
    const q = [search.trim(), activeCategory !== 'All' ? CATEGORY_QUERIES[activeCategory] || '' : ''].filter(Boolean).join(' ') || 'wedding vendor';
    const c = coordsOverride !== undefined ? coordsOverride : coords;
    const loc = (locationOverride !== undefined ? locationOverride : locationQ).trim();
    const onlineActive = online && REMOTE_PLAUSIBLE.includes(activeCategory);
    const body = { q };
    if (onlineActive) { /* the location bias is dropped on purpose */ } else if (c) { body.lat = c.lat; body.lng = c.lng; } else if (loc) body.location = loc;
    try {
      const places = await api.places.search(body);
      setVendors((places || []).map((p) => ({ id: p.place_id, placeId: p.place_id, name: p.name, category: categoryFromTypes(p.types), searchCategory: activeCategory !== 'All' ? activeCategory : null, rating: p.rating, reviewCount: p.user_ratings_total || 0, location: p.address || '', priceRange: p.price_level != null ? (PRICE_MAP[p.price_level] || '') : '', photoReference: p.photo_reference || null, mapsUrl: p.maps_url || null, website: null, phone: null })));
      setStatus('done');
    } catch { setStatus('error'); setVendors(null); }
  };
  // The desktop auto-searches near the ceremony venue once it knows it.
  useEffect(() => { if (eventLocation && !searched.current) { setLocationQ(eventLocation); runSearch({ coordsOverride: null, locationOverride: eventLocation, isAuto: true }); } }, [eventLocation]); // eslint-disable-line react-hooks/exhaustive-deps
  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeo('Location is not available on this device'); return; }
    setGeo('locating');
    navigator.geolocation.getCurrentPosition((pos) => { const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setCoords(c); setGeo(''); setLocationQ(''); runSearch({ coordsOverride: c, locationOverride: '' }); }, () => setGeo('Could not get your location'), { timeout: 8000, maximumAge: 300000 });
  };
  const useEventLocation = () => { if (!eventLocation) return; setCoords(null); setLocationQ(eventLocation); runSearch({ coordsOverride: null, locationOverride: eventLocation }); };
  const filtered = useMemo(() => {
    if (!vendors) return [];
    let list = vendors.filter((v) => (minRating ? (v.rating || 0) >= 4 : true));
    if (sortBy === 'Rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === 'Reviews') list = [...list].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    return list;
  }, [vendors, minRating, sortBy]);
  const save = async (v, details) => {
    setSaving((s) => new Set([...s, v.id]));
    try { await onSave(v, details); } finally { setSaving((s) => { const n = new Set(s); n.delete(v.id); return n; }); }
  };

  return (
    <Screen title="Marketplace" subtitle={recommended && status === 'done' ? 'Near your venue' : 'Real vendors near you'} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
            <input className="oi-m-input" style={{ paddingLeft: 42 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="A name, or what you are looking for" enterKeyHint="search" onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} />
          </div>
          <div style={{ margin: '0 calc(-1 * 16px)' }}><FilterPills options={CATEGORIES.map((c) => ({ key: c, label: c }))} value={category} onChange={(c) => { setCategory(c); runSearch({ categoryOverride: c }); }} /></div>
          <div style={{ position: 'relative' }}>
            <MapPin size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
            <input className="oi-m-input" style={{ paddingLeft: 42 }} value={locationQ} onChange={(e) => { setLocationQ(e.target.value); setCoords(null); }} placeholder="City, region or postcode" enterKeyHint="search" onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <PillButton variant={coords ? 'primary' : 'secondary'} size="sm" icon={Navigation} onClick={useMyLocation} disabled={geo === 'locating'}>{geo === 'locating' ? 'Finding you' : coords ? 'Near you' : 'Use my location'}</PillButton>
            {eventLocation && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={useEventLocation}>Use event location</PillButton>}
          </div>
          {geo && geo !== 'locating' && <p className="oi-m-meta">{geo}</p>}
          {REMOTE_PLAUSIBLE.includes(category) && (
            <div className="oi-m-row" style={{ padding: 0, minHeight: 44, background: 'transparent' }}>
              <Checkbox checked={online} onChange={setOnline} label="Online services" />
              <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44, alignSelf: 'stretch' }} onClick={() => setOnline((v) => !v)}><div className="oi-m-row__label">Online services</div><div className="oi-m-row__sub">Search without a location for a category that can work remotely</div></button>
            </div>
          )}
          <PillButton variant="primary" icon={Search} onClick={() => runSearch()} disabled={status === 'searching'}>{status === 'searching' ? 'Searching' : 'Search'}</PillButton>
        </div>

        {status === 'error' ? <ErrorState text="Search did not work. Try again in a moment." onRetry={() => runSearch()} /> : status === 'searching' ? <SkeletonRows count={4} /> : !vendors ? (
          <EmptyState icon={ShoppingBag} text="Choose a category and where to look, and we search Google for real businesses nearby." />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}><SelectField label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={SORTS} /></div>
              <PillButton variant={minRating ? 'primary' : 'secondary'} size="sm" icon={Star} onClick={() => setMinRating((v) => !v)} style={{ marginBottom: 4 }}>4 stars and up</PillButton>
            </div>
            {filtered.length === 0 ? <EmptyState icon={ShoppingBag} text="Nothing found. Try another category or a wider area." /> : (
              <ItemList>
                {filtered.map((v) => (
                  <ItemCard key={v.id} image={api.places.photo(v.photoReference, 240) || ''} alt={v.name} icon={ShoppingBag} tile="neutral" title={v.name} meta={[v.category || v.searchCategory, v.location].filter(Boolean).join(', ')} value={v.rating != null ? `${v.rating} stars${v.reviewCount ? ` (${v.reviewCount})` : ''}${v.priceRange ? `, ${v.priceRange}` : ''}` : v.priceRange} badge={savedIds.has(v.placeId) ? 'Added' : undefined} badgeTone="ok" onClick={() => setProfile(v)} action={savedIds.has(v.placeId) ? undefined : { icon: saving.has(v.id) ? Check : Plus, label: `Add ${v.name} to my vendors`, tone: 'primary', onClick: () => save(v, null) }} />
                ))}
              </ItemList>
            )}
          </>
        )}
      </div>
      {profile && <ProfileSheet vendor={profile} isSaved={savedIds.has(profile.placeId)} onClose={() => setProfile(null)} onSave={(details) => save(profile, details)} />}
    </Screen>
  );
}

/** VendorProfileModal: place details (photo, rating, reviews, website, phone, maps) and Add. */
function ProfileSheet({ vendor, isSaved, onClose, onSave }) {
  const api = useApi();
  const [details, setDetails] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => { let alive = true; api.places.details(vendor.placeId).then((d) => { if (alive) { setDetails(d); setState('done'); } }).catch(() => { if (alive) setState('error'); }); return () => { alive = false; }; }, [vendor.placeId, api]);
  const photo = api.places.photo(details?.photo_reference || vendor.photoReference, 800);
  const rating = details?.rating ?? vendor.rating;
  const reviews = details?.reviews || [];
  return (
    <BottomSheet open onClose={onClose} title={vendor.name} full footer={(
      <>
        <PillButton variant="secondary" onClick={onClose}>Close</PillButton>
        <PillButton variant="primary" icon={isSaved ? Check : Plus} style={{ flex: 1 }} disabled={isSaved} onClick={() => onSave(details)}>{isSaved ? 'In my vendors' : 'Add to my vendors'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SmartImage src={photo || ''} alt={vendor.name} width={350} ratio="16/9" eager />
        <div>
          <div className="oi-m-meta">{[vendor.category || vendor.searchCategory, vendor.priceRange].filter(Boolean).join(', ')}</div>
          {rating != null && <div className="oi-m-body" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Star size={16} /> {rating} of 5{(details?.user_ratings_total ?? vendor.reviewCount) ? `, ${details?.user_ratings_total ?? vendor.reviewCount} Google reviews` : ''}</div>}
          {(details?.address || vendor.location) && <div className="oi-m-meta">{details?.address || vendor.location}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {details?.website && <PillButton variant="secondary" size="sm" icon={Globe} onClick={() => openExternal(details.website)}>Website</PillButton>}
          {details?.phone && <PillButton variant="secondary" size="sm" icon={Phone} onClick={() => openExternal(`tel:${details.phone}`)}>{details.phone}</PillButton>}
          {(details?.maps_url || vendor.mapsUrl) && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={() => openExternal(details?.maps_url || vendor.mapsUrl)}>Open in Maps</PillButton>}
        </div>
        {details?.opening_hours?.weekday_text && <div className="oi-m-card"><div className="oi-m-meta" style={{ marginBottom: 4 }}>Hours</div>{details.opening_hours.weekday_text.map((l) => <div key={l} className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{l}</div>)}</div>}
        <section>
          <h3 className="oi-m-section" style={{ marginBottom: 12 }}>Reviews</h3>
          {state === 'loading' ? <SkeletonRows count={3} /> : reviews.length === 0 ? <p className="oi-m-meta">No reviews to show.</p> : reviews.map((r, i) => (
            <div key={i} className="oi-m-card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{r.author_name}</span><StatusPill tone="neutral">{r.rating} of 5</StatusPill></div>
              <div className="oi-m-meta">{r.relative_time_description}</div>
              {r.text && <p className="oi-m-body" style={{ marginTop: 6 }}>{r.text}</p>}
            </div>
          ))}
        </section>
      </div>
    </BottomSheet>
  );
}

