import React from 'react';

export default function MenuCardPreview({ universe, weddingDetails }) {
  const names = weddingDetails?.coupleNames || 'Sarah & James';
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB')
    : '15 March 2026';
  const venue = weddingDetails?.mainCeremony?.venueName || 'The Grand Hall';
  const menuItems = weddingDetails?.menuItems || [
    { course: 'Entrée', dish: 'Burrata & Heirloom Tomato', description: 'With aged balsamic and basil oil' },
    { course: 'Main', dish: 'Slow-Roasted Beef Tenderloin', description: 'With truffle jus and seasonal vegetables' },
    { course: 'Dessert', dish: 'Dark Chocolate Tart', description: 'With salted caramel and crème fraîche' },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', background: '#F8F7F5',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 14px',
      fontFamily: 'Cormorant Garamond, Georgia, serif',
      overflow: 'hidden'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap');`}</style>

      {/* Top rule */}
      <div style={{ width: '100%', height: '1px', background: '#CCCCCC', marginBottom: 8 }} />

      {/* MENU label */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#888888', textAlign: 'center', marginBottom: 4 }}>
        DINNER
      </p>

      {/* Names */}
      <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: '#0A0A0A', textAlign: 'center', marginBottom: 2 }}>
        {names}
      </p>
      <p style={{ fontSize: 7, color: '#888888', letterSpacing: '0.15em', marginBottom: 8, textAlign: 'center' }}>{date}</p>

      {/* Full rule */}
      <div style={{ width: '100%', height: '1px', background: '#DDDDDD', marginBottom: 8 }} />

      {/* Menu items */}
      {menuItems.slice(0, 3).map((item, i) => (
        <div key={i} style={{ width: '100%', marginBottom: 8, textAlign: 'center' }}>
          <p style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.25em', color: '#888888', marginBottom: 1 }}>
            {item.course}
          </p>
          <p style={{ fontWeight: 400, fontSize: 11, color: '#0A0A0A', marginBottom: 1 }}>{item.dish}</p>
          <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 8, color: '#888888' }}>{item.description}</p>
        </div>
      ))}

      {/* Footer */}
      <div style={{ marginTop: 'auto', width: '100%' }}>
        <div style={{ width: '100%', height: '1px', background: '#DDDDDD', marginBottom: 6 }} />
        <p style={{ fontSize: 7, color: '#888888', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
          {venue}
        </p>
      </div>
    </div>
  );
}