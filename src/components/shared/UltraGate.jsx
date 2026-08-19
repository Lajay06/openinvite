import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';

const F = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

/**
 * Full-page Ultra paywall — a blurred mock of the real UI behind a centered
 * upgrade card. Originally built for Guest Suite (StudioGuestSuite.jsx);
 * extracted here so other Ultra-only features (Design Studio) can reuse the
 * same look instead of a second hand-rolled copy.
 */
export default function UltraGate({
  heading = 'This is an Ultra feature',
  description = 'Upgrade to Ultra to unlock this feature.',
  tabs = ['Website', 'Assets', 'Experience Guide', 'Policies', 'Share'],
}) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      {/* Blurred demo background */}
      <div style={{ filter: 'blur(4px)', opacity: 0.22, pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
          <div style={{ width: 60, height: 12, background: 'rgba(10,10,10,0.12)', borderRadius: 2 }} />
          <div style={{ width: 120, height: 16, background: 'rgba(10,10,10,0.12)', borderRadius: 2, margin: '0 auto' }} />
        </div>
        <div style={{ height: 48, borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'flex-end', padding: '0 24px', gap: 0 }}>
          {tabs.map((tab, i) => (
            <div key={i} style={{ height: 48, padding: '0 18px', display: 'flex', alignItems: 'center', borderBottom: i === 0 ? '2px solid #E03553' : '2px solid transparent' }}>
              <div style={{ width: tab.length * 7, height: 11, background: 'rgba(10,10,10,0.1)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '40px 32px' }}>
          {[100, 80, 90].map((w, i) => (
            <div key={i} style={{ height: 72, background: 'rgba(10,10,10,0.04)', borderRadius: 4, marginBottom: 16, width: `${w}%` }} />
          ))}
        </div>
      </div>

      {/* Upgrade overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)', padding: '48px 40px', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(10,10,10,0.12)' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Crown size={28} color="#FFFFFF" strokeWidth={1.8} />
          </div>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.12em', margin: '0 0 10px', ...F }}>ULTRA FEATURE</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0A0A0A', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.2, ...F }}>
            {heading}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', lineHeight: 1.7, margin: '0 0 32px', ...F }}>
            {description}
          </p>
          <button
            onClick={() => navigate('/account')}
            style={{ width: '100%', padding: '14px 24px', border: 'none', borderRadius: 999, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#FFFFFF', fontSize: 15, fontWeight: 800, cursor: 'pointer', ...F, letterSpacing: '0.01em', marginBottom: 16 }}
          >
            Upgrade to Ultra
          </button>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0, ...F }}>
            Already on Ultra? Make sure you're signed in with the right account.
          </p>
        </div>
      </div>
    </div>
  );
}
