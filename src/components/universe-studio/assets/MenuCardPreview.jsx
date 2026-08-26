import React from 'react';

import { coupleDisplayName } from '@/lib/coupleNames';
// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function MenuCardPreview({ universe, weddingDetails }) {
  const colors = universe?.colors;
  const bg = colors?.lightBg || '#F8F7F5';
  const text = colors?.lightText || '#0A0A0A';
  const muted = colors?.accentSecondary || '#888888';
  const rule = colors?.accentSecondary ? `${colors.accentSecondary}55` : '#DDDDDD';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  const names = coupleDisplayName(weddingDetails, 'Sarah & James');
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
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 14px',
      fontFamily: headingFont,
      overflow: 'hidden'
    }}>
      {/* Top rule */}
      <div style={{ width: '100%', height: '1px', background: rule, marginBottom: 8 }} />

      {/* MENU label */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.4em', textTransform: 'uppercase', color: muted, textAlign: 'center', marginBottom: 4 }}>
        DINNER
      </p>

      {/* Names */}
      <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: text, textAlign: 'center', marginBottom: 2 }}>
        {names}
      </p>
      <p style={{ fontSize: 7, color: muted, letterSpacing: '0.15em', marginBottom: 8, textAlign: 'center' }}>{date}</p>

      {/* Full rule */}
      <div style={{ width: '100%', height: '1px', background: rule, marginBottom: 8 }} />

      {/* Menu items */}
      {menuItems.slice(0, 3).map((item, i) => (
        <div key={i} style={{ width: '100%', marginBottom: 8, textAlign: 'center' }}>
          <p style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.25em', color: muted, marginBottom: 1 }}>
            {item.course}
          </p>
          <p style={{ fontWeight: 400, fontSize: 11, color: text, marginBottom: 1 }}>{item.dish}</p>
          <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: 8, color: muted }}>{item.description}</p>
        </div>
      ))}

      {/* Footer */}
      <div style={{ marginTop: 'auto', width: '100%' }}>
        <div style={{ width: '100%', height: '1px', background: rule, marginBottom: 6 }} />
        <p style={{ fontSize: 7, color: muted, letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
          {venue}
        </p>
      </div>
    </div>
  );
}