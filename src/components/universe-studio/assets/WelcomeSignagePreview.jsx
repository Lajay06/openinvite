import React from 'react';

import { coupleDisplayName } from '@/lib/coupleNames';
// Fallback only — used if a universe somehow has no imageUrl (none currently
// do; all 20 carry a real, distinct photo).
const FALLBACK_IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14274_nhniqk.jpg';

// universe: the full config object (colors/typography), not just its id —
// see UniverseWorldView.jsx's Chapter 6 comment for why.
export default function WelcomeSignagePreview({ universe, weddingDetails }) {
  const bg = universe?.colors?.lightBg || '#F8F7F5';
  const text = universe?.colors?.lightText || '#0A0A0A';
  const muted = universe?.colors?.accentSecondary || '#888888';
  const rule = universe?.colors?.accentSecondary ? `${universe.colors.accentSecondary}55` : '#CCCCCC';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  // The universe's own destination photography (PR B), not the shared
  // couple-photo stock shoot — see SaveTheDatePreview.jsx's own comment for
  // why this is correct for a "browsing universes" preview specifically.
  const image = universe?.imageUrl ? universe.imageUrl.replace(/\.jpg$/, '-800.jpg') : FALLBACK_IMAGE;
  const names = coupleDisplayName(weddingDetails, 'Sarah & James');
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '15 March 2026';
  const venue = weddingDetails?.mainCeremony?.venueName || 'The Grand Hall';

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px',
      fontFamily: headingFont,
      position: 'relative', overflow: 'hidden'
    }}>
      {/* PR B: the universe's own destination photo, low-opacity backdrop
          behind the lettering — see SaveTheDatePreview.jsx's comment. */}
      <img
        src={image}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.16 }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Top rule */}
      <div style={{ width: '100%', height: '1px', background: rule, marginBottom: 12 }} />

      {/* Welcome label */}
      <p style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.4em', textTransform: 'uppercase', color: muted, textAlign: 'center', marginBottom: 8 }}>
        WELCOME TO THE WEDDING OF
      </p>

      {/* Couple names — large */}
      <p style={{
        fontWeight: 300, fontSize: 30, color: text,
        letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.1,
        marginBottom: 10
      }}>
        {names}
      </p>

      {/* Date & venue */}
      <p style={{ fontSize: 9, color: muted, textAlign: 'center', letterSpacing: '0.1em', marginBottom: 2 }}>
        {date}
      </p>
      <p style={{ fontSize: 9, color: muted, textAlign: 'center', letterSpacing: '0.1em', marginBottom: 12 }}>
        {venue}
      </p>

      {/* Bottom rule */}
      <div style={{ width: '100%', height: '1px', background: rule, marginBottom: 8 }} />

      {/* Footer text */}
      <p style={{ fontSize: 6, fontWeight: 300, letterSpacing: '0.35em', textTransform: 'uppercase', color: muted, textAlign: 'center' }}>
        PLEASE FIND YOUR SEAT INSIDE
      </p>
      </div>
    </div>
  );
}