import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, X, ChevronLeft, Heart, Star, MapPin, ExternalLink } from 'lucide-react';

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
  { key: 'weddingWeekend', label: 'Wedding Weekend' },
];

const LS_KEY = (slug) => `guide_saved_${slug}`;

function photoUrl(ref) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=600`;
}

export default function ExperienceGuidePage() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [saved, setSaved] = useState({});

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY(weddingSlug));
    if (raw) setSaved(JSON.parse(raw));
  }, [weddingSlug]);

  useEffect(() => {
    base44.entities.WeddingDetails.filter({ slug: weddingSlug })
      .then(rows => rows.length > 0 && setDetails(rows[0]))
      .catch(err => console.error('[ExperienceGuide]', err))
      .finally(() => setLoading(false));
  }, [weddingSlug]);

  const toggleSaved = (placeId) => {
    setSaved(prev => {
      const next = { ...prev, [placeId]: !prev[placeId] };
      localStorage.setItem(LS_KEY(weddingSlug), JSON.stringify(next));
      return next;
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!details || !details.experienceGuide?.published) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>This guide isn't published yet</h1>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.4)' }}>Check back soon for the wedding destination guide.</p>
          <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", borderRadius: 999 }}>← Back to wedding site</Link>
        </div>
      </div>
    );
  }

  const guide = details.experienceGuide;
  const enabledCategories = CATEGORIES.filter(c => guide.categories?.[c.key]?.enabled !== false && (guide.categories?.[c.key]?.places?.length > 0));
  const city = details.mainCeremony?.address?.split(',').slice(-3, -1).join(',').trim() || 'Our Destination';

  const savedPlaces = Object.entries(saved).filter(([, v]) => v).map(([k]) => {
    for (const cat of CATEGORIES) {
      const place = guide.categories?.[cat.key]?.places?.find(p => p.place_id === k);
      if (place) return place;
    }
    return null;
  }).filter(Boolean);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: '#0A0A0A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
          Guest guide
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {savedPlaces.length > 0 && (
            <a href="#saved" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#E03553', fontWeight: 700, textDecoration: 'none' }}>
              <Heart size={14} fill="#E03553" /> {savedPlaces.length}
            </a>
          )}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A0A0A' }}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile category menu */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', padding: '16px 20px', zIndex: 99, maxHeight: '70vh', overflowY: 'auto' }}>
          {enabledCategories.map(cat => (
            <a
              key={cat.key}
              href={`#category-${cat.key}`}
              onClick={() => { setActiveCategory(cat.key); setMobileMenuOpen(false); }}
              style={{ display: 'block', fontSize: 14, fontWeight: 600, color: activeCategory === cat.key ? '#E03553' : '#0A0A0A', textDecoration: 'none', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}
            >
              {cat.label}
              <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(10,10,10,0.4)' }}>{guide.categories?.[cat.key]?.places?.length || 0}</span>
            </a>
          ))}
        </div>
      )}

      {/* HERO */}
      <div style={{ position: 'relative', height: '100svh', overflow: 'hidden', background: '#0A0A0A' }}>
        {guide.heroPhotoUrl ? (
          <img src={guide.heroPhotoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A1930 0%, #1A0A20 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 60px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px' }}>
            {details.couple1Name} & {details.couple2Name} · Guest guide
          </p>
          <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(36px, 10vw, 64px)', color: '#FFFFFF', margin: '0 0 16px', lineHeight: 1.1 }}>
            {city}
          </h1>
          {guide.editorialIntro && (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 480, marginBottom: 24 }}>{guide.editorialIntro}</p>
          )}
          {guide.vibes?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {guide.vibes.map(v => (
                <span key={v} style={{ padding: '5px 14px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em', borderRadius: 999 }}>{v}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Couple's Picks */}
      {guide.couplePicks?.length > 0 && (
        <CouplePicks picks={guide.couplePicks} details={details} saved={saved} onToggle={toggleSaved} />
      )}

      {/* Saved places */}
      {savedPlaces.length > 0 && (
        <div id="saved" style={{ padding: '60px 0 40px', borderTop: '1px solid #F0F0F0' }}>
          <div style={{ padding: '0 24px', marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 6px' }}>Your saves</p>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#0A0A0A', margin: 0 }}>Saved places</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
            {savedPlaces.map(place => (
              <PlaceCard key={place.place_id} place={place} isSaved={true} onToggle={toggleSaved} />
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {enabledCategories.map((cat, idx) => {
        const places = guide.categories?.[cat.key]?.places || [];
        return (
          <div key={cat.key} id={`category-${cat.key}`} style={{ padding: '60px 0', borderTop: '1px solid #F0F0F0' }}>
            <div style={{ padding: '0 24px', marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 4px' }}>
                  {String(idx + 1).padStart(2, '0')}
                </p>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(28px, 6vw, 40px)', color: '#0A0A0A', margin: 0 }}>
                  {cat.label}
                </h2>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontWeight: 600 }}>{places.length} places</span>
            </div>

            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
              {places.map(place => (
                <PlaceCard key={place.place_id} place={place} isSaved={!!saved[place.place_id]} onToggle={toggleSaved} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ padding: '60px 24px', background: '#0A0A0A', textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.08em' }}>
          {details.couple1Name} & {details.couple2Name}
        </p>
        <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', padding: '12px 28px', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', borderRadius: 999 }}>
          Back to wedding site
        </Link>
      </div>
    </div>
  );
}

function CouplePicks({ picks, details, saved, onToggle }) {
  return (
    <div style={{ padding: '60px 0 40px' }}>
      <div style={{ padding: '0 24px', marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 6px' }}>
          {details?.couple1Name} & {details?.couple2Name}
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#0A0A0A', margin: 0 }}>
          Our favourite places
        </h2>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
        {picks.map(pick => (
          <PlaceCard key={pick.place_id} place={pick} isSaved={!!saved[pick.place_id]} onToggle={onToggle} featured />
        ))}
      </div>
    </div>
  );
}

function PlaceCard({ place, isSaved, onToggle, featured }) {
  const photo = place.photo_ref ? photoUrl(place.photo_ref) : place.photo || null;

  return (
    <div style={{ flexShrink: 0, width: featured ? 300 : 280, scrollSnapAlign: 'start', background: '#FFFFFF', border: '1px solid #F0F0F0', overflow: 'hidden' }}>
      <div style={{ height: 200, background: '#F0F0F0', position: 'relative', overflow: 'hidden' }}>
        {photo ? (
          <img src={photo} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #F0F0F0, #E8E8E8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={24} color="rgba(10,10,10,0.2)" />
          </div>
        )}
        {place.note && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>"{place.note}"</p>
          </div>
        )}
        <button
          onClick={() => onToggle(place.place_id)}
          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Heart size={14} fill={isSaved ? '#E03553' : 'none'} color={isSaved ? '#E03553' : '#0A0A0A'} />
        </button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{place.name}</p>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: '0 0 10px', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4 }}>{place.address}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {place.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Star size={11} fill="#E03553" color="#E03553" /> {place.rating}
            </span>
          )}
          {place.price_level != null && place.price_level > 0 && (
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {'$'.repeat(place.price_level)}
            </span>
          )}
          {place.category && <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{place.category}</span>}
        </div>

        {place.maps_url && (
          <a
            href={place.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#0A0A0A', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <MapPin size={12} /> Get directions
          </a>
        )}
      </div>
    </div>
  );
}
