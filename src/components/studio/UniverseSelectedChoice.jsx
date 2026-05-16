import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function UniverseSelectedChoice({ universe, coupleName, onClose }) {
  const navigate = useNavigate();

  const handleChoice = (choice) => {
    if (choice === 'ava') navigate('/studio/ava?from=universe');
    else if (choice === 'builder') navigate('/studio/website?from=universe');
    else navigate('/dashboard');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40,
      animation: 'fadeIn 0.4s ease',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Confirmation */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 16 }}>
          {universe.name} Universe selected
        </p>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 'clamp(36px, 5vw, 64px)', color: '#FFFFFF', letterSpacing: '0.1em', margin: '0 0 12px', textTransform: 'uppercase' }}>
          {universe.name}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
          Applied to all 10 assets in your Guest Suite
        </p>
      </div>

      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 }}>
        How would you like to build your wedding?
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 640, width: '100%' }}>
        {/* Ava's Studio */}
        <div
          onClick={() => handleChoice('ava')}
          style={{ padding: '40px 32px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.background = 'rgba(224,53,83,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 20, color: '#FFF' }}>✦</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>Ava's Studio</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: '0 0 20px' }}>
            Let Ava guide you one step at a time. Personal, focused, no overwhelm.
          </p>
          <p style={{ fontSize: 11, color: '#E03553', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Recommended →</p>
        </div>

        {/* Website Builder */}
        <div
          onClick={() => handleChoice('builder')}
          style={{ padding: '40px 32px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <div style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="3" y1="9" x2="21" y2="9" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: '0 0 8px' }}>Website Builder</p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: '0 0 20px' }}>
            Full creative control. Edit every section, page, and asset yourself.
          </p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Advanced →</p>
        </div>
      </div>

      <button onClick={() => handleChoice('dashboard')} style={{ marginTop: 32, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.25)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        Go to dashboard →
      </button>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}