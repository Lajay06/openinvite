import React from 'react';

export default function ThankYouPreview({ universe, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const message = weddingDetails?.thankYouMessage || 'Your presence on our wedding day meant the world to us. Thank you for celebrating this moment with us.';

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0A0A0A',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      position: 'relative'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&display=swap');`}</style>

      {/* Top rule */}
      <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.15)' }} />

      {/* Recipient placeholder */}
      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
        PERSONALISED FOR EACH GUEST
      </p>

      {/* Thank you */}
      <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 16, color: '#FFFFFF', textAlign: 'center', letterSpacing: '0.05em', marginBottom: 8, lineHeight: 1.3 }}>
        Thank you, [Guest Name].
      </p>

      {/* Message */}
      <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.6, fontWeight: 300, maxWidth: '85%' }}>
        {message.slice(0, 80)}{message.length > 80 ? '…' : ''}
      </p>

      {/* Divider */}
      <div style={{ width: 30, height: '1px', background: 'rgba(255,255,255,0.2)', margin: '10px 0' }} />

      {/* Names */}
      <p style={{ fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center' }}>
        {names}
      </p>

      {/* Bottom rule */}
      <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
    </div>
  );
}