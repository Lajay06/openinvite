import React from 'react';

const UNIVERSES = [
  {
    id: 'aman',
    name: 'AMAN',
    tagline: 'Quiet Luxury',
    bg: '#0A0A0A',
    accent: '#FFFFFF',
    available: true,
  },
  { id: 'tulum', name: 'TULUM', tagline: 'Organic Luxury', bg: '#C4A882', accent: '#3D2B1F', available: true },
  { id: 'kyoto', name: 'KYOTO', tagline: 'Japanese Minimalism', bg: '#F5F0EB', accent: '#2D2926', available: true },
  { id: 'capri', name: 'CAPRI', tagline: 'Mediterranean Summer', bg: '#1A6EBD', accent: '#FFE566', available: true },
  { id: 'marrakech', name: 'MARRAKECH', tagline: 'Desert Opulence', bg: '#8B3A1A', accent: '#F0C060', available: true },
  { id: 'brooklyn', name: 'BROOKLYN', tagline: 'Urban Industrial', bg: '#1C1C1C', accent: '#E5E5E5', available: true },
  { id: 'bali', name: 'BALI', tagline: 'Tropical Spirit', bg: '#2D5A27', accent: '#F5E6CC', available: true },
  { id: 'paris', name: 'PARIS', tagline: 'French Romance', bg: '#F9F4EE', accent: '#8B6347', available: true },
  { id: 'capetown', name: 'CAPE TOWN', tagline: 'Safari Chic', bg: '#C4A882', accent: '#5C3D2E', available: true },
  { id: 'mykonos', name: 'MYKONOS', tagline: 'Aegean Blue', bg: '#1B4F8A', accent: '#FFFFFF', available: true },
];

// Mini preview of the AMAN save-the-date
function AmanMiniPreview() {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      position: 'relative'
    }}>
      <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
      <p style={{
        fontFamily: 'Cormorant Garamond, Georgia, serif',
        fontWeight: 300, fontSize: 11, color: '#FFFFFF',
        letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center'
      }}>Sarah & James</p>
      <div style={{ width: 24, height: '1px', background: 'rgba(255,255,255,0.3)', margin: '6px 0' }} />
      <p style={{ fontSize: 7, color: '#FFFFFF', letterSpacing: '0.35em', textAlign: 'center' }}>15 · III · 2026</p>
      <p style={{ fontSize: 6, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', marginTop: 4, textAlign: 'center' }}>Sydney, Australia</p>
      <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.2)' }} />
      <p style={{ position: 'absolute', bottom: 8, fontSize: 5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>SAVE THE DATE</p>
    </div>
  );
}

export default function UniverseSelector({ selectedUniverse, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
      {UNIVERSES.map((u) => {
        const isSelected = selectedUniverse === u.id;
        return (
          <div
            key={u.id}
            onClick={() => onSelect(u.id)}
            style={{
              flexShrink: 0,
              width: 200,
              height: 140,
              border: isSelected ? '2px solid #E03553' : '2px solid #EEEEEE',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
              background: u.bg,
            }}
          >
            {u.id === 'aman' ? (
              <AmanMiniPreview />
            ) : (
              <div style={{
                position: 'absolute', inset: 0, background: u.bg,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ color: u.accent, fontSize: 14, fontWeight: 700, letterSpacing: '0.1em' }}>{u.name}</p>
                <p style={{ color: u.accent, fontSize: 9, opacity: 0.7, letterSpacing: '0.06em', marginTop: 4 }}>{u.tagline}</p>
              </div>
            )}

            {/* Label */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'rgba(0,0,0,0.7)', padding: '6px 10px'
            }}>
              <p style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{u.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.1em' }}>{u.tagline}</p>
            </div>

            {isSelected && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                width: 16, height: 16, borderRadius: '50%',
                background: '#E03553',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}