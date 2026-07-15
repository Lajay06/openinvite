/**
 * EdinburghMasthead — the "edinburgh-estate" layout's hero: a formal,
 * generously spaced heritage-card composition, an EdinburghThistle mark
 * quietly beneath the names.
 */
import React from 'react';
import EdinburghThistle from './EdinburghThistle';

export default function EdinburghMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 680, margin: '0 auto' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.7, margin: '0 0 24px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.3rem, 6vw, 4.2rem)', lineHeight: 1.15, color, margin: '0 0 30px' }}>
        {coupleNames}
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <EdinburghThistle color={accent} opacity={0.55} size={34} />
      </div>
    </div>
  );
}
