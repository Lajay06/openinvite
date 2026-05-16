import React from 'react';

export default function WelcomeSignagePreview({ universe, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '15 March 2026';
  const venue = weddingDetails?.mainCeremony?.venueName || 'The Grand Hall';

  return (
    <div style={{
      width: '100%', height: '100%', background: '#F8F7F5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      position: 'relative'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&display=swap');`}</style>

      {/* Top rule */}
      <div style={{ width: '100%', height: '1px', background: '#CCCCCC', marginBottom: 12 }} />

      {/* Welcome label */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#888888', textAlign: 'center', marginBottom: 8 }}>
        WELCOME TO THE WEDDING OF
      </p>

      {/* Couple names — large */}
      <p style={{
        fontWeight: 300, fontSize: 30, color: '#0A0A0A',
        letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.1,
        marginBottom: 10
      }}>
        {names}
      </p>

      {/* Date & venue */}
      <p style={{ fontSize: 9, color: '#888888', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 2 }}>
        {date}
      </p>
      <p style={{ fontSize: 9, color: '#888888', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 12 }}>
        {venue}
      </p>

      {/* Bottom rule */}
      <div style={{ width: '100%', height: '1px', background: '#CCCCCC', marginBottom: 8 }} />

      {/* Footer text */}
      <p style={{ fontSize: 6, fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#888888', textAlign: 'center' }}>
        PLEASE FIND YOUR SEAT INSIDE
      </p>
    </div>
  );
}