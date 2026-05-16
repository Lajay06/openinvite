import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Menu, X, ChevronLeft } from 'lucide-react';

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

export default function ExperienceGuidePage() {
  const { weddingSlug } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const all = await base44.entities.WeddingDetails.filter({ slug: weddingSlug });
        if (all.length > 0) {
          setDetails(all[0]);
        }
      } catch (err) {
        console.error('Failed to fetch wedding details:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, [weddingSlug]);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0A0A0A', marginBottom: 12 }}>This guide isn't published yet</h1>
          <p style={{ fontSize: 14, color: '#888' }}>Check back later for our wedding destination guide.</p>
          <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', marginTop: 24, padding: '12px 24px', background: '#0A0A0A', color: '#FFFFFF', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: 'Plus Jakarta Sans' }}>← Back to Wedding Site</Link>
        </div>
      </div>
    );
  }

  const enabledCategories = CATEGORIES.filter(c => details.experienceGuide.categories?.[c.key]?.enabled !== false);
  const city = details.mainCeremony?.address?.split(',').slice(-3, -1).join(',').trim() || 'Our Destination';

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Mobile nav bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, height: 56, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <Link to={`/w/${weddingSlug}`} style={{ color: '#0A0A0A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <ChevronLeft size={16} /> Back
        </Link>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
          Guest Guide
        </p>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#0A0A0A' }}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', padding: '16px 20px', zIndex: 99 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {enabledCategories.map(cat => (
              <a
                key={cat.key}
                href={`#category-${cat.key}`}
                onClick={() => { setActiveCategory(cat.key); setMobileMenuOpen(false); }}
                style={{ fontSize: 14, fontWeight: 600, color: activeCategory === cat.key ? '#E03553' : '#0A0A0A', textDecoration: 'none', padding: '8px 0' }}
              >
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* HERO */}
      <ExperienceGuideHero guide={details.experienceGuide} details={details} city={city} />

      {/* Sticky category nav (desktop) */}
      <div style={{ position: 'sticky', top: 56, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #EEEEEE', overflowX: 'auto', display: 'none', '@media (min-width: 768px)': { display: 'flex' } }}>
        <div style={{ display: 'flex', padding: '0 24px', gap: 0 }}>
          {enabledCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); document.getElementById(`category-${cat.key}`)?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{
                padding: '14px 20px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeCategory === cat.key ? '#0A0A0A' : 'transparent'}`,
                fontSize: 12, fontWeight: 600, color: activeCategory === cat.key ? '#0A0A0A' : '#888',
                cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.05em', whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Couple's Picks */}
      {details.experienceGuide.couplePicks?.length > 0 && (
        <CouplePicks picks={details.experienceGuide.couplePicks} details={details} />
      )}

      {/* Category Sections */}
      {enabledCategories.map((cat, idx) => (
        <div key={cat.key} id={`category-${cat.key}`} style={{ padding: '60px 0', borderTop: idx > 0 ? '1px solid #F0F0F0' : 'none' }}>
          <div style={{ padding: '0 24px', marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
                {String(idx + 1).padStart(2, '0')}
              </p>
              <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(28px, 6vw, 40px)', color: '#0A0A0A', margin: 0 }}>
                {cat.label}
              </h2>
            </div>
          </div>
          
          {/* Placeholder for places — would fetch from API */}
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', paddingBottom: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ padding: '60px 24px', background: '#0A0A0A', textAlign: 'center' }}>
          {details.couple1Name} & {details.couple2Name}
        </p>
        <Link to={`/w/${weddingSlug}`} style={{ display: 'inline-block', padding: '12px 24px', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 12, fontWeight: 700, fontFamily: 'Plus Jakarta Sans', letterSpacing: '0.1em' }}>
          Back to Wedding Site
        </Link>
      </div>
    </div>
  );
}

function ExperienceGuideHero({ guide, details, city }) {
  return (
    <div style={{ position: 'relative', height: '100svh', overflow: 'hidden', background: '#0A0A0A' }}>
      {/* Background */}
      {guide?.heroPhotoUrl ? (
        <img src={guide.heroPhotoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.6 }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A1930 0%, #1A0A20 100%)' }} />
      )}
      
      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.1) 100%)' }} />
      
      {/* Content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 60px' }}>
          {details?.couple1Name} & {details?.couple2Name} · Guest Guide
        </p>
          {city}
        </h1>
        {guide?.editorialIntro && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 480, marginBottom: 24 }}>
            {guide.editorialIntro}
          </p>
        )}
        
        {/* Vibe tags */}
        {guide?.vibes?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {guide.vibes.map(vibe => (
              <span key={vibe} style={{ padding: '5px 12px', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: '0.1em', fontFamily: 'Plus Jakarta Sans' }}>
                {vibe}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Scroll indicator */}
      <div style={{ position: 'absolute', bottom: 24, right: 24, display: 'none', '@media (min-width: 768px)': { display: 'block' } }}>
      </div>
    </div>
  );
}

function CouplePicks({ picks, details }) {
  return (
    <div style={{ padding: '60px 0 40px' }}>
      <div style={{ padding: '0 24px', marginBottom: 24 }}>
          {details?.couple1Name} & {details?.couple2Name}
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#0A0A0A', margin: 0 }}>
          Our Favourite Places
        </h2>
      </div>
      
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 24px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
        {picks.map(pick => (
          <CouplePickCard key={pick.placeId} pick={pick} />
        ))}
      </div>
    </div>
  );
}

function CouplePickCard({ pick }) {
  return (
    <div style={{ flexShrink: 0, width: 280, scrollSnapAlign: 'start' }}>
      <div style={{ height: 200, background: '#F0F0F0', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
        {pick.photo && <img src={pick.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {pick.note && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>"{pick.note}"</p>
          </div>
        )}
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans' }}>{pick.name}</p>
      <p style={{ fontSize: 12, color: '#888', margin: 0, fontFamily: 'Plus Jakarta Sans' }}>{pick.category}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ flexShrink: 0, width: 300, scrollSnapAlign: 'start', background: '#FFFFFF', border: '1px solid #EEEEEE', overflow: 'hidden' }}>
      <div style={{ height: 220, background: '#F0F0F0', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #F0F0F0 25%, #F8F8F8 50%, #F0F0F0 75%)', backgroundSize: '200% 100%', animation: 'skeletonShimmer 1.2s ease-in-out infinite' }} />
        <style>{`@keyframes skeletonShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
      </div>
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ height: 16, background: '#F0F0F0', borderRadius: 2, marginBottom: 12, width: '60%' }} />
        <div style={{ height: 14, background: '#F0F0F0', borderRadius: 2, marginBottom: 8 }} />
        <div style={{ height: 14, background: '#F0F0F0', borderRadius: 2, marginBottom: 16, width: '80%' }} />
        <div style={{ height: 1, background: '#F0F0F0', margin: '0 0 14px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ height: 44, background: '#F0F0F0', borderRadius: 2 }} />
          <div style={{ height: 44, background: '#F0F0F0', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}