import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchWeddingBySlug } from '@/lib/weddingBySlug';
import { ChevronLeft, Heart, Star, MapPin, ExternalLink, Clock } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: 'food',      label: 'Food & dining',   q: 'restaurants' },
  { key: 'stay',      label: 'Stay',             q: 'hotels' },
  { key: 'explore',   label: 'Explore',          q: 'things to do tourist attractions' },
  { key: 'transport', label: 'Getting around',   q: 'car rental taxi rideshare' },
];

const LS_KEY = (slug) => `guide_saved_${slug}`;

function photoUrl(ref) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=600`;
}

function StarRating({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#0A0A0A', fontFamily: PJS }}>
      <Star size={11} fill="#E03553" color="#E03553" strokeWidth={0} />
      {rating.toFixed(1)}
    </span>
  );
}

function PriceLevel({ level }) {
  if (level == null || level === 0) return null;
  return (
    <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
      {'$'.repeat(level)}
    </span>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      <div style={{ height: 160, background: '#F0F0F0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #F0F0F0 25%, #F8F8F8 50%, #F0F0F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.2s ease-in-out infinite' }} />
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ height: 14, width: '65%', background: '#EEEEEE', borderRadius: 2, marginBottom: 8 }} />
        <div style={{ height: 12, width: '90%', background: '#F5F5F5', borderRadius: 2, marginBottom: 6 }} />
        <div style={{ height: 12, width: '40%', background: '#F5F5F5', borderRadius: 2 }} />
      </div>
      <style>{`@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
    </div>
  );
}

// ── Place card ─────────────────────────────────────────────────────────────────

function PlaceCard({ place, isSaved, onToggle }) {
  const photo = place.photo_reference ? photoUrl(place.photo_reference) : (place.photo_ref ? photoUrl(place.photo_ref) : null);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden', background: '#FFFFFF' }}>
      <div style={{ height: 160, background: '#F5F5F5', position: 'relative', overflow: 'hidden' }}>
        {photo ? (
          <img src={photo} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={24} color="rgba(10,10,10,0.15)" />
          </div>
        )}
        <button
          onClick={() => onToggle(place.place_id)}
          aria-label={isSaved ? 'Remove from saved' : 'Save place'}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Heart size={14} fill={isSaved ? '#E03553' : 'none'} color={isSaved ? '#E03553' : 'rgba(10,10,10,0.5)'} />
        </button>
      </div>

      <div style={{ padding: '14px 16px 16px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS, lineHeight: 1.3 }}>
          {place.name}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '0 0 10px', fontFamily: PJS, lineHeight: 1.4 }}>
          {place.address}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <StarRating rating={place.rating} />
          {place.user_ratings_total > 0 && (
            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
              ({place.user_ratings_total.toLocaleString()})
            </span>
          )}
          <PriceLevel level={place.price_level} />
        </div>

        {place.note && (
          <p style={{ fontSize: 12, color: '#0A0A0A', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.5, fontFamily: PJS }}>
            "{place.note}"
          </p>
        )}

        <a
          href={place.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: '#FFFFFF',
            background: '#0A0A0A', borderRadius: 999,
            padding: '7px 14px', textDecoration: 'none', fontFamily: PJS,
          }}
        >
          <ExternalLink size={11} /> View on maps
        </a>
      </div>
    </div>
  );
}

// ── Curated couple picks ───────────────────────────────────────────────────────

function CouplePicksSection({ guide, details, saved, onToggle }) {
  const picks = guide.couplePicks || [];
  if (picks.length === 0) return null;

  return (
    <div style={{ borderBottom: '1px solid #EEEEEE' }}>
      <div style={{ padding: '28px 24px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS }}>
          {details.couple1Name} & {details.couple2Name}
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
          Our favourite places
        </p>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {picks.map(place => (
          <div key={place.place_id} style={{ flexShrink: 0, width: 260, scrollSnapAlign: 'start' }}>
            <PlaceCard place={place} isSaved={!!saved[place.place_id]} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Saved places section ───────────────────────────────────────────────────────

function SavedSection({ savedPlaces, saved, onToggle }) {
  if (savedPlaces.length === 0) return null;
  return (
    <div id="saved" style={{ borderBottom: '1px solid #EEEEEE' }}>
      <div style={{ padding: '28px 24px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Heart size={14} fill="#E03553" color="#E03553" />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
          Saved places
        </p>
        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>({savedPlaces.length})</span>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {savedPlaces.map(place => (
          <div key={place.place_id} style={{ flexShrink: 0, width: 260, scrollSnapAlign: 'start' }}>
            <PlaceCard place={place} isSaved={true} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ExperienceGuidePage() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('food');
  const [places, setPlaces] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [saved, setSaved] = useState({});
  const [tabCache, setTabCache] = useState({});

  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY(weddingSlug)); if (raw) setSaved(JSON.parse(raw)); } catch {}
  }, [weddingSlug]);

  useEffect(() => {
    fetchWeddingBySlug(weddingSlug)
      .then(wedding => wedding && setDetails(wedding))
      .catch(err => console.error('[ExperienceGuide]', err))
      .finally(() => setLoading(false));
  }, [weddingSlug]);

  const fetchPlaces = useCallback(async (tabKey, location) => {
    if (tabCache[tabKey]) {
      setPlaces(tabCache[tabKey].places);
      setIsMock(tabCache[tabKey].mock);
      return;
    }
    setFetching(true);
    const tab = TABS.find(t => t.key === tabKey);
    if (!tab) { setFetching(false); return; }
    try {
      const params = new URLSearchParams({ q: tab.q });
      if (location) params.set('location', location);
      const res = await fetch(`/api/places?${params}`);
      const data = await res.json();
      const result = { places: data.places || [], mock: data.mock || false };
      setTabCache(prev => ({ ...prev, [tabKey]: result }));
      setPlaces(result.places);
      setIsMock(result.mock);
    } catch {
      setPlaces([]);
    }
    setFetching(false);
  }, [tabCache]);

  useEffect(() => {
    if (!details) return;
    const location = details.mainCeremony?.address || '';
    fetchPlaces(activeTab, location);
  }, [activeTab, details]);

  const toggleSaved = (placeId) => {
    setSaved(prev => {
      const next = { ...prev, [placeId]: !prev[placeId] };
      try { localStorage.setItem(LS_KEY(weddingSlug), JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const savedPlacesList = Object.entries(saved).filter(([, v]) => v).map(([id]) => {
    for (const cached of Object.values(tabCache)) {
      const found = cached.places.find(p => p.place_id === id);
      if (found) return found;
    }
    const guide = details?.experienceGuide;
    if (guide) {
      for (const cat of Object.values(guide.categories || {})) {
        const found = (cat.places || []).find(p => p.place_id === id);
        if (found) return found;
      }
      const pick = (guide.couplePicks || []).find(p => p.place_id === id);
      if (pick) return pick;
    }
    return null;
  }).filter(Boolean);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ width: 24, height: 24, border: '2px solid #EEE', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!details) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', fontFamily: PJS }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>Wedding not found</h1>
        </div>
      </div>
    );
  }

  const guide = details.experienceGuide || {};
  const venueAddress = details.mainCeremony?.address;
  const venueCity = venueAddress?.split(',').slice(-3, -1).join(',').trim() || 'the venue';
  const coupleName = [details.couple1Name, details.couple2Name].filter(Boolean).join(' & ');

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>

      {/* Sticky top nav */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, height: 56,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EEEEEE',
        display: 'flex', alignItems: 'center', padding: '0 16px',
      }}>
        <Link
          to={`/w/${weddingSlug}`}
          style={{ color: '#0A0A0A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, fontFamily: PJS }}
        >
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
          Explore {venueCity}
        </p>
        {savedPlacesList.length > 0 && (
          <a
            href="#saved"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E03553', fontWeight: 700, textDecoration: 'none', fontFamily: PJS }}
          >
            <Heart size={13} fill="#E03553" /> {savedPlacesList.length}
          </a>
        )}
      </div>

      {/* Editorial hero — only if published */}
      {guide.published && (
        <div style={{ position: 'relative', height: 260, background: '#0A0A0A', overflow: 'hidden' }}>
          {guide.heroPhotoUrl ? (
            <img src={guide.heroPhotoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A1930 0%, #1A0A20 100%)' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2))' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 28px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px', fontFamily: PJS }}>
              {coupleName} · Guest guide
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px', fontFamily: PJS, lineHeight: 1.2 }}>
              {venueCity}
            </p>
            {guide.editorialIntro && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: 440, margin: 0, fontFamily: PJS }}>
                {guide.editorialIntro}
              </p>
            )}
          </div>
        </div>
      )}

      {/* No venue address callout */}
      {!venueAddress && (
        <div style={{ padding: '20px 24px', background: 'rgba(10,10,10,0.03)', borderBottom: '1px solid #EEEEEE' }}>
          <p style={{ fontSize: 13, color: '#0A0A0A', fontFamily: PJS, margin: 0, lineHeight: 1.6 }}>
            <strong>Add your venue address</strong> in Ceremony Details to unlock local recommendations.
          </p>
        </div>
      )}

      {/* Mock data notice */}
      {isMock && (
        <div style={{ padding: '10px 24px', background: 'rgba(224,53,83,0.05)', borderBottom: '1px solid rgba(224,53,83,0.12)' }}>
          <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: 0 }}>
            Showing sample data — add <strong>GOOGLE_PLACES_API_KEY</strong> to your environment variables to see real results.
          </p>
        </div>
      )}

      {/* Couple's picks — only if published and have picks */}
      {guide.published && (
        <CouplePicksSection guide={guide} details={details} saved={saved} onToggle={toggleSaved} />
      )}

      {/* Itinerary — only if published and itinerary has days */}
      {guide.published && guide.itinerary?.schedule?.length > 0 && (
        <ItinerarySection guide={guide} details={details} />
      )}

      {/* Saved places */}
      <SavedSection savedPlaces={savedPlacesList} saved={saved} onToggle={toggleSaved} />

      {/* Discover nearby header */}
      <div style={{ padding: '24px 24px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 2px', fontFamily: PJS }}>Discover nearby</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
          Local recommendations
        </p>
        {venueAddress && (
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', margin: '4px 0 0', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} strokeWidth={1.8} /> Near {venueCity}
          </p>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        position: 'sticky', top: 56, zIndex: 50,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #EEEEEE',
        display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        marginTop: 16,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 18px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab.key ? '#0A0A0A' : 'transparent'}`,
              fontSize: 12, fontWeight: 600,
              color: activeTab === tab.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: PJS,
              minHeight: 48, flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results grid */}
      <div style={{ padding: '24px' }}>
        {fetching ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : places.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              {venueAddress ? 'No results found for this category.' : 'Add your venue address to see nearby recommendations.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {places.map(place => (
              <PlaceCard
                key={place.place_id}
                place={place}
                isSaved={!!saved[place.place_id]}
                onToggle={toggleSaved}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '40px 24px', background: '#0A0A0A', textAlign: 'center', marginTop: 24 }}>
        {coupleName && (
          <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.06em', fontFamily: PJS }}>
            {coupleName}
          </p>
        )}
        <Link
          to={`/w/${weddingSlug}`}
          style={{
            display: 'inline-block', padding: '10px 24px',
            border: '1px solid rgba(255,255,255,0.25)',
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'none', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.08em', borderRadius: 999, fontFamily: PJS,
          }}
        >
          Back to wedding site
        </Link>
      </div>
    </div>
  );
}

// ── Itinerary section (guest-facing, read-only) ────────────────────────────────

const TIME_BLOCKS = ['morning', 'afternoon', 'evening'];

function ItinerarySection({ guide, details }) {
  const itinerary = guide.itinerary;
  const coupleName = [details.couple1Name, details.couple2Name].filter(Boolean).join(' & ');

  const findSavedPlace = (placeId) => {
    for (const cat of Object.values(guide.categories || {})) {
      const found = (cat.places || []).find(p => p.place_id === placeId);
      if (found) return found;
    }
    return null;
  };

  return (
    <div style={{ borderBottom: '1px solid #EEEEEE' }}>
      <div style={{ padding: '40px 24px 24px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS }}>
          {coupleName}
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>
          {itinerary.schedule.length === 1 ? 'Suggested day plan' : `${itinerary.schedule.length}-day itinerary`}
        </p>
      </div>

      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {itinerary.schedule.map(day => (
          <ItineraryDayCard key={day.day} day={day} findSavedPlace={findSavedPlace} />
        ))}
      </div>
    </div>
  );
}

function ItineraryDayCard({ day, findSavedPlace }) {
  const hasActivities = TIME_BLOCKS.some(b => (day.blocks?.[b] || []).length > 0);
  if (!hasActivities) return null;

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
      {/* Day header */}
      <div style={{ padding: '18px 20px', background: '#0A0A0A' }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', fontFamily: PJS, margin: '0 0 4px' }}>
          Day {day.day}
        </p>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS, margin: '0 0 4px', lineHeight: 1.25 }}>
          {day.title || `Day ${day.day}`}
        </p>
        {day.summary && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: PJS, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
            {day.summary}
          </p>
        )}
      </div>

      {/* Time blocks */}
      {TIME_BLOCKS.map((block, bi) => {
        const activities = day.blocks?.[block] || [];
        if (activities.length === 0) return null;
        return (
          <div key={block} style={{ borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            {/* Block label */}
            <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={10} color="rgba(10,10,10,0.3)" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.3)', fontFamily: PJS }}>
                {block.charAt(0).toUpperCase() + block.slice(1)}
              </span>
            </div>
            {/* Activities */}
            <div style={{ padding: '10px 0 4px' }}>
              {activities.map((activity, ai) => {
                const savedPlace = activity.type === 'place' ? findSavedPlace(activity.place_id) : null;
                const photo = activity.photo_url || (savedPlace?.photo_ref ? photoUrl(savedPlace.photo_ref) : null);
                const name = activity.place_name || activity.custom_text || '';
                const mapsUrl = savedPlace?.maps_url;

                return (
                  <div
                    key={activity.id || `${block}-${ai}`}
                    style={{
                      display: 'flex', gap: 0, alignItems: 'stretch',
                      borderBottom: ai < activities.length - 1 ? '1px solid rgba(10,10,10,0.05)' : 'none',
                    }}
                  >
                    {/* Photo — landscape strip on the left */}
                    <div style={{ width: 100, flexShrink: 0, background: '#F0F0F0', position: 'relative', overflow: 'hidden', minHeight: 90 }}>
                      {photo ? (
                        <img src={photo} alt={name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.parentNode.style.background = '#F0F0F0'; e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <MapPin size={18} color="rgba(10,10,10,0.12)" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                      {/* Time + duration row */}
                      {(activity.time || activity.duration) && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                          {activity.time && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>{activity.time}</span>
                          )}
                          {activity.duration && (
                            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>{activity.duration}</span>
                          )}
                        </div>
                      )}

                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: PJS, lineHeight: 1.3 }}>
                        {name}
                      </p>

                      {activity.category && (
                        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.5)', fontFamily: PJS, marginBottom: 6 }}>
                          {activity.category}
                        </span>
                      )}

                      {activity.description && (
                        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: '0 0 6px', fontFamily: PJS, lineHeight: 1.6 }}>
                          {activity.description}
                        </p>
                      )}

                      {!activity.description && activity.note && (
                        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: '0 0 6px', fontFamily: PJS, fontStyle: 'italic', lineHeight: 1.5 }}>
                          {activity.note}
                        </p>
                      )}

                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, textDecoration: 'none', marginTop: 2 }}>
                          <ExternalLink size={10} /> View on maps
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
