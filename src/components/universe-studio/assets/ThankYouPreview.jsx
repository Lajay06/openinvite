import React from 'react';

// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function ThankYouPreview({ universe, weddingDetails }) {
  const bg = universe?.colors?.darkBg || '#0A0A0A';
  const text = universe?.colors?.darkText || '#FFFFFF';
  const accent = universe?.colors?.accent || '#E03553';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const message = weddingDetails?.thankYouMessage || 'Your presence on our wedding day meant the world to us. Thank you for celebrating this moment with us.';

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px',
      fontFamily: headingFont,
      position: 'relative'
    }}>
      {/* Top rule */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: '1px', background: `${text}26` }} />

      {/* Recipient placeholder — the universe's own accent */}
      <p style={{ fontSize: 8, color: accent, letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
        PERSONALIZED FOR EACH GUEST
      </p>

      {/* Thank you */}
      <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 16, color: text, textAlign: 'center', letterSpacing: '0.05em', marginBottom: 8, lineHeight: 1.3 }}>
        Thank you, [Guest Name].
      </p>

      {/* Message */}
      <p style={{ fontSize: 8, color: `${text}80`, textAlign: 'center', lineHeight: 1.6, fontWeight: 300, maxWidth: '85%' }}>
        {message.slice(0, 80)}{message.length > 80 ? '…' : ''}
      </p>

      {/* Divider */}
      <div style={{ width: 30, height: '1px', background: accent, margin: '10px 0' }} />

      {/* Names */}
      <p style={{ fontWeight: 300, fontSize: 11, color: `${text}B3`, letterSpacing: '0.1em', textAlign: 'center' }}>
        {names}
      </p>

      {/* Bottom rule */}
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, height: '1px', background: `${text}26` }} />
    </div>
  );
}