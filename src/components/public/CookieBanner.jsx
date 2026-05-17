import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PJS = "'Plus Jakarta Sans', sans-serif";
const KEY = 'oi_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (!stored) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem(KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes oi-cookie-slide {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: '#0A0A0A', borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px',
        animation: 'oi-cookie-slide 0.4s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: PJS, margin: 0, lineHeight: 1.5 }}>
            We use cookies to improve your experience.{' '}
            <Link to="/cookie-policy"
              style={{ color: '#E03553', textDecoration: 'none', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Cookie policy
            </Link>
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={decline}
              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', background: 'none', border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
              Decline
            </button>
            <button onClick={accept}
              style={{ padding: '7px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', background: '#FFFFFF', border: 'none', color: '#0A0A0A', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>
              Accept
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
