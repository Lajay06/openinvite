/**
 * UniverseTile — a large-format poster tile for the Design Studio universe
 * wall. Replaces the old ~90px thumbnail strip. Every visual value comes
 * from the universe object (sourced from UNIVERSE_CONFIGS via
 * src/lib/universeCatalog.js) — no hardcoded palette here, which is the
 * bug this rebuild kills (see universeCatalog.js's header comment).
 *
 * imageUrl is an optional background-photography slot. It's null for
 * every universe today — until real photography exists, the palette +
 * type + motif treatment IS the poster; this component never fakes an
 * image.
 */
import React, { useState } from 'react';
import { Crown } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function UniverseTile({ universe, isCurrent, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { name, tagline, tileDescription, tags, isUltra, colors, typography, imageUrl } = universe;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', width: '100%', aspectRatio: '3 / 4', minHeight: 280,
        background: colors.darkBg, border: isCurrent ? `2px solid ${colors.accent}` : '2px solid transparent',
        cursor: 'pointer', overflow: 'hidden', padding: 0, textAlign: 'left',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      {imageUrl && (
        <img src={imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {imageUrl && (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 40%, ${colors.darkBg}E6 100%)` }} />
      )}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          {isCurrent && (
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: colors.darkBg, background: colors.accent, padding: '4px 10px', borderRadius: 999 }}>
              Your current universe
            </span>
          )}
          {isUltra && (
            <span style={{ marginLeft: isCurrent ? 0 : 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: '#FFFFFF', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 999 }}>
              <Crown size={10} /> Ultra
            </span>
          )}
        </div>

        <div>
          <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: colors.accent, margin: '0 0 6px' }}>
            {tagline}
          </p>
          <h3 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(1.7rem, 2.6vw, 2.4rem)', color: colors.lightBg, margin: '0 0 10px', lineHeight: 1.05 }}>
            {name}
          </h3>
          <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, color: colors.lightBg, opacity: 0.72, margin: '0 0 12px', lineHeight: 1.5 }}>
            {tileDescription}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tags.map(tag => (
              <span key={tag} style={{ fontSize: 9.5, fontWeight: 600, fontFamily: PJS, letterSpacing: '0.04em', color: colors.lightBg, opacity: 0.55, border: `1px solid ${colors.lightBg}33`, borderRadius: 999, padding: '2px 8px' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
