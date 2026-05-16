import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const UNIVERSES = [
  { id: 'aman', name: 'AMAN', tagline: 'Quiet Luxury', description: 'Stripped back. Only what matters.', style: ['Luxury', 'Minimal'], mood: ['Dark', 'Monochrome'], status: 'active', available: true, number: '01', photo: 'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg', accentColor: '#C4956A' },
  { id: 'tulum', name: 'TULUM', tagline: 'Desert Bloom', description: 'Sun-bleached romance. Bohemian soul.', style: ['Bohemian', 'Romantic'], mood: ['Warm', 'Earthy'], status: 'coming-soon', available: false, number: '02', photo: 'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg', accentColor: '#D4AA70' },
  { id: 'kyoto', name: 'KYOTO', tagline: 'Zen & Ceremony', description: 'Ancient ritual. Modern refinement.', style: ['Minimal', 'Cultural'], mood: ['Cool', 'Monochrome'], status: 'coming-soon', available: false, number: '03', photo: 'https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg', accentColor: '#8B9FD4' },
  { id: 'capri', name: 'CAPRI', tagline: 'Italian Coast', description: 'La dolce vita. Forever yours.', style: ['Luxury', 'Romantic'], mood: ['Light', 'Warm'], status: 'coming-soon', available: false, number: '04', photo: 'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg', accentColor: '#5A9E8A' },
  { id: 'marrakech', name: 'MARRAKECH', tagline: 'Spice & Gold', description: 'Sensory richness. Cultural depth.', style: ['Cultural', 'Bohemian'], mood: ['Warm', 'Earthy'], status: 'coming-soon', available: false, number: '05', photo: 'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg', accentColor: '#D4AA70' },
  { id: 'brooklyn', name: 'BROOKLYN', tagline: 'Industrial Edge', description: 'Raw beauty. Considered cool.', style: ['Modern', 'Minimal'], mood: ['Dark', 'Cool'], status: 'coming-soon', available: false, number: '06', photo: 'https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg', accentColor: '#888888' },
  { id: 'bali', name: 'BALI', tagline: 'Sacred Garden', description: 'Lush. Spiritual. Effortlessly beautiful.', style: ['Bohemian', 'Tropical'], mood: ['Warm', 'Earthy'], status: 'coming-soon', available: false, number: '07', photo: 'https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg', accentColor: '#7A9E7E' },
  { id: 'paris', name: 'PARIS', tagline: 'Haussmann Romance', description: 'Grand. Timeless. Uncompromisingly elegant.', style: ['Luxury', 'Romantic'], mood: ['Light', 'Warm'], status: 'coming-soon', available: false, number: '08', photo: 'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg', accentColor: '#C4768A' },
  { id: 'cape-town', name: 'CAPE TOWN', tagline: 'Wild & Free', description: 'Mountain meets ocean. Bold and alive.', style: ['Modern', 'Rustic'], mood: ['Cool', 'Earthy'], status: 'coming-soon', available: false, number: '09', photo: 'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg', accentColor: '#6B7FA3' },
];

const STYLE_FILTERS = ['All', 'Luxury', 'Minimal', 'Romantic', 'Bohemian', 'Modern', 'Rustic', 'Tropical', 'Cultural'];
const MOOD_FILTERS = ['All', 'Dark', 'Light', 'Warm', 'Cool', 'Earthy', 'Monochrome'];

function UniverseCard({ universe, isActive }) {
  const navigate = useNavigate();
  const handleClick = () => { if (universe.available) navigate('/studio/universe/aman'); };
  return (
    <div onClick={handleClick} style={{ background: '#0A0A0A', position: 'relative', overflow: 'hidden', cursor: universe.available ? 'pointer' : 'default', aspectRatio: '4/5', transition: 'transform 0.4s ease' }}
      onMouseEnter={e => universe.available && (e.currentTarget.style.transform = 'scale(1.01)')}
      onMouseLeave={e => universe.available && (e.currentTarget.style.transform = 'scale(1)')}
    >
      <img src={universe.photo} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: universe.available ? 0.35 : 0.15, transition: 'opacity 0.4s ease' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.5) 50%, transparent 100%)' }} />
      <div style={{ position: 'absolute', top: 24, left: 28 }}>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 13, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>{universe.number}</span>
      </div>
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
        {isActive ? (
          <div style={{ border: '1px solid #DDF762', padding: '3px 10px' }}>
            <span style={{ fontSize: 9, color: '#DDF762', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700 }}>SELECTED</span>
          </div>
        ) : universe.available ? (
          <div style={{ border: '1px solid rgba(255,255,255,0.3)', padding: '3px 10px' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700 }}>AVAILABLE</span>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(255,255,255,0.15)', padding: '3px 10px' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700 }}>COMING SOON</span>
          </div>
        )}
      </div>
      {!universe.available && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={20} color="rgba(255,255,255,0.2)" />
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 28px' }}>
        <div style={{ width: 32, height: 1, background: universe.accentColor, marginBottom: 20, opacity: 0.7 }} />
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(36px, 4vw, 52px)', color: '#FFFFFF', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 6px', lineHeight: 1 }}>
          {universe.name}
        </h2>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 12px', fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif' }}>{universe.tagline}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 24px', lineHeight: 1.5 }}>{universe.description}</p>
        {universe.available && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
              {isActive ? 'View Universe' : 'Explore Universe'}
            </span>
            <span style={{ color: universe.accentColor, fontSize: 14 }}>→</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioUniverse() {
  const navigate = useNavigate();
  const [styleFilter, setStyleFilter] = useState('All');
  const [moodFilter, setMoodFilter] = useState('All');
  const [activeUniverse, setActiveUniverse] = useState(null);
  const [coupleName, setCoupleName] = useState('');

  const params = new URLSearchParams(window.location.search);
  const fromOnboarding = params.get('from') === 'onboarding';

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(r => {
      if (r.length > 0) {
        setActiveUniverse(r[0].activeUniverse || null);
        const d = r[0];
        setCoupleName(d.coupleNames || (d.couple1Name && d.couple2Name ? `${d.couple1Name} & ${d.couple2Name}` : ''));
      }
    }).catch(() => {});
  }, []);

  const filteredUniverses = UNIVERSES.filter(u => {
    const styleMatch = styleFilter === 'All' || u.style.includes(styleFilter);
    const moodMatch = moodFilter === 'All' || u.mood.includes(moodFilter);
    return styleMatch && moodMatch;
  });

  const filterBtnStyle = (active) => ({
    border: `1px solid ${active ? '#FFF' : 'rgba(255,255,255,0.12)'}`,
    background: active ? '#FFFFFF' : 'transparent',
    color: active ? '#0A0A0A' : 'rgba(255,255,255,0.4)',
    padding: '5px 14px', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.08em',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ background: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#FFFFFF', minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 40, background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
        <button onClick={() => navigate('/studio')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>
          ← Studio
        </button>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Guest Suite</p>
        <div style={{ width: 80 }} />
      </div>

      {/* Welcome banner (from onboarding) */}
      {fromOnboarding && coupleName && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 39, background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 48px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DDF762', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Welcome, <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{coupleName}</span>. Choose your visual universe — this defines the aesthetic of your entire wedding suite.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ position: 'sticky', top: fromOnboarding && coupleName ? 104 : 56, background: '#0A0A0A', borderBottom: '1px solid rgba(255,255,255,0.08)', height: 52, display: 'flex', alignItems: 'center', padding: '0 48px', gap: 24, overflowX: 'auto', zIndex: 35, scrollbarWidth: 'none' }}>
        <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', whiteSpace: 'nowrap' }}>STYLE</span>
        {STYLE_FILTERS.map(f => (
          <button key={f} onClick={() => setStyleFilter(f)} style={filterBtnStyle(styleFilter === f)}
            onMouseEnter={e => { if (styleFilter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
            onMouseLeave={e => { if (styleFilter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
          >{f}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.2em', whiteSpace: 'nowrap' }}>MOOD</span>
        {MOOD_FILTERS.map(f => (
          <button key={f} onClick={() => setMoodFilter(f)} style={filterBtnStyle(moodFilter === f)}
            onMouseEnter={e => { if (moodFilter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
            onMouseLeave={e => { if (moodFilter !== f) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
          >{f}</button>
        ))}
      </div>

      {/* Hero intro */}
      <div style={{ padding: '120px 48px 48px', background: '#0A0A0A' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40 }}>
          <div>
            <p style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 16 }}>9 UNIVERSES · 10 PIECES EACH</p>
            <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(40px, 6vw, 72px)', color: '#FFFFFF', letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              Choose Your Universe.
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 360, lineHeight: 1.7, textAlign: 'right', marginBottom: 8 }}>
            Each universe is a complete invitation suite — designed around a single, unified aesthetic vision. Select one to explore it fully before committing.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: '0 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.06)', padding: '1px' }}>
          {filteredUniverses.map(u => (
            <div key={u.id} style={{ background: '#0A0A0A' }}>
              <UniverseCard universe={u} isActive={activeUniverse === u.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: '60px 48px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>More universes arriving soon. Each one a world unto itself.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {UNIVERSES.map(u => (
            <div key={u.id} style={{ width: 6, height: 6, borderRadius: '50%', background: activeUniverse === u.id ? '#DDF762' : u.available ? '#FFFFFF' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
      </div>

      <style>{`div[style*="overflowX: auto"]::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}