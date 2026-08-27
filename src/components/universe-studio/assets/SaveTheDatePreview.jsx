import React, { useEffect, useState } from 'react';

import { coupleDisplayName } from '@/lib/coupleNames';
// universe: the FULL config object from UNIVERSE_CATALOG/UNIVERSE_CONFIGS
// (colors, typography, ...), not just its id — the caller (UniverseWorldView's
// Chapter 6) already calls loadUniverseFont(universe) on mount, so by the
// time this renders, universe.typography's real Google Font is already
// loading/loaded; no separate font-loading needed here. Falls back to
// generic values so this still renders sensibly if ever used without a
// resolved universe.
// Fallback only — used if a universe somehow has no imageUrl (none currently
// do; all 20 carry a real, distinct photo). Same "Bandits" shoot photo this
// file used unconditionally before PR B.
const FALLBACK_IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14229_mhwb5h.jpg';

export default function SaveTheDatePreview({ universe, weddingDetails }) {
  const bg = universe?.colors?.darkBg || '#0A0A0A';
  const text = universe?.colors?.darkText || '#FFFFFF';
  const accent = universe?.colors?.accent || '#E03553';
  const headingFont = universe?.typography?.headingFont || 'Georgia, serif';
  // The universe's own destination photography (UNIVERSE_CONFIGS.imageUrl —
  // 20 distinct, verified photos), not the shared couple-photo stock shoot.
  // -800 is the same responsive variant UniverseWorldView.jsx's HeroChapter
  // already requests for a card this size.
  //
  // THIS IS NOW THE ONLY SAVE-THE-DATE IN THE PRODUCT, and it is an
  // ILLUSTRATION. The asset feature — the tool a couple used to produce a real
  // one from their own uploaded photo — was removed in Wave 2. This component
  // survives because its second job is showing what a universe looks like at
  // the moment someone chooses one (UniverseWorldView, and onboarding through
  // it). It renders scenery, not a deliverable.
  const image = universe?.imageUrl ? universe.imageUrl.replace(/\.jpg$/, '-800.jpg') : FALLBACK_IMAGE;
  const names = coupleDisplayName(weddingDetails, 'Sarah & James');
  const date = weddingDetails?.weddingDate
    ? new Date(weddingDetails.weddingDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' · ')
    : '15 · 03 · 2026';
  const location = weddingDetails?.mainCeremony?.address || 'Sydney, Australia';

  const [visibleChars, setVisibleChars] = useState(0);
  const chars = names.split('');

  useEffect(() => {
    setVisibleChars(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleChars(i);
      if (i >= chars.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [names]);

  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: headingFont,
    }}>
      {/* PR B: the universe's own destination photo (see `image` above) —
          this is a "browsing universes" preview, so a couple's actual save-
          the-date photo obviously isn't known yet; showing that universe's
          own scenery here (not a shared stock couple photo) is what
          actually differentiates the 20 styles while previewing. */}
      <img
        src={image}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.75) 100%)' }} />

      {/* Foreground — its own stacking context so it always paints above
          the photo + scrim regardless of DOM order. */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Top rule */}
        <div style={{ position: 'absolute', top: 28, left: 0, right: 0, height: '1px', background: `${text}33` }} />

        {/* Names — animated */}
        <p style={{
          fontWeight: 300, fontSize: 22, color: text,
          letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center',
          margin: 0, minHeight: 32, lineHeight: 1.2
        }}>
          {chars.map((char, i) => (
            <span key={i} style={{ opacity: i < visibleChars ? 1 : 0, transition: 'opacity 0.1s ease' }}>{char}</span>
          ))}
        </p>

        {/* Center rule — the universe's own accent, not a neutral divider */}
        <div style={{ width: 40, height: '1px', background: accent, margin: '10px 0' }} />

        {/* Date */}
        <p style={{ fontSize: 9, color: text, letterSpacing: '0.4em', textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>
          {date}
        </p>
        <p style={{ fontSize: 8, color: `${text}99`, letterSpacing: '0.2em', marginTop: 4, textAlign: 'center' }}>
          {location}
        </p>

        {/* Bottom rule */}
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, height: '1px', background: `${text}33` }} />

        {/* Bottom label — the universe's own accent */}
        <p style={{
          position: 'absolute', bottom: 12,
          fontSize: 7, color: accent,
          letterSpacing: '0.5em', textTransform: 'uppercase', textAlign: 'center'
        }}>
          SAVE THE DATE
        </p>
      </div>
    </div>
  );
}