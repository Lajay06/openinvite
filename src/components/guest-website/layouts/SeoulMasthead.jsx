/**
 * SeoulMasthead — the "seoul-glass" layout's hero: minimal, generous
 * whitespace, a sans-serif heading (Outfit) — a deliberate departure from
 * the mostly-serif crowd — with a soft SeoulOrb sitting behind the names.
 */
import React from 'react';
import SeoulOrb from './SeoulOrb';

export default function SeoulMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 0 }}>
        <SeoulOrb color={accent} opacity={0.3} size={200} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {kicker && (
          <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color, opacity: 0.7, margin: '0 0 20px' }}>
            {kicker}
          </p>
        )}
        <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.3rem, 6vw, 4.2rem)', lineHeight: 1.15, color, margin: 0 }}>
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
