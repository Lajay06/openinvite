import React, { useState } from "react";

const BRANDS = [
  { name: 'Spotify', icon: '♪' },
  { name: 'Google', icon: 'G' },
  { name: 'Pinterest', icon: 'P' },
  { name: 'Booking.com', icon: 'B' },
  { name: 'Stripe', icon: 'S' },
  { name: 'Airbnb', icon: '⌂' },
  { name: 'WhatsApp', icon: 'W' },
  { name: 'Instagram', icon: '◎' },
];

const doubled = [...BRANDS, ...BRANDS];

const maskStyle = {
  overflow: 'hidden',
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
  maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
};

function BrandItem({ brand, i }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      key={i}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '16px 40px',
        borderRight: '1px solid #F0F0F0',
        cursor: 'default',
        background: hovered ? '#F9F9F9' : 'transparent',
        transition: 'background 0.2s ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: '18px', color: '#AAAAAA', fontFamily: 'sans-serif' }}>{brand.icon}</span>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{brand.name}</span>
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#E0E0DC', display: 'inline-block', marginLeft: '16px' }} />
    </div>
  );
}

export default function IntegrationsSection() {
  return (
    <section style={{ background: '#FFFFFF', padding: '100px 0', overflow: 'hidden' }}>

      {/* Centred heading */}
      <div style={{ textAlign: 'center', marginBottom: '64px', padding: '0 80px' }}>
        <p style={{ color: 'rgba(10,10,10,0.4)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          INTEGRATIONS
        </p>
        <h2 style={{ color: '#0A0A0A', fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Works with the tools you already love.
        </h2>
        <p style={{ color: 'rgba(10,10,10,0.4)', fontSize: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Openinvite connects seamlessly with the platforms you use every day.
        </p>
      </div>

      {/* Row 1 — scrolls left */}
      <div style={{ ...maskStyle, marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', width: 'max-content', animation: 'marqueeLeft 30s linear infinite' }}>
          {doubled.map((brand, i) => <BrandItem key={i} brand={brand} i={i} />)}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div style={maskStyle}>
        <div style={{ display: 'flex', flexDirection: 'row', width: 'max-content', animation: 'marqueeRight 30s linear infinite' }}>
          {doubled.map((brand, i) => <BrandItem key={i} brand={brand} i={i} />)}
        </div>
      </div>

    </section>
  );
}