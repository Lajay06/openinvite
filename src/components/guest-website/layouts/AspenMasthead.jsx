/**
 * AspenMasthead — the "aspen-lodge" layout's hero: centred, refined
 * hotel-lobby restraint, an AspenPine mark quietly above the names rather
 * than a rule beneath them.
 */
import React from 'react';
import AspenPine from './AspenPine';

export default function AspenMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
        <AspenPine color={accent} opacity={0.55} size={36} />
      </div>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.7, margin: '0 0 20px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6.5vw, 4.4rem)', lineHeight: 1.12, color, margin: 0 }}>
        {coupleNames}
      </h1>
    </div>
  );
}
