/**
 * FlorenceMasthead — the "florence-editorial" layout's hero: an
 * asymmetric magazine-style composition (left-aligned kicker, names set
 * large), a loose FlorenceVine flourish beneath.
 */
import React from 'react';
import FlorenceVine from './FlorenceVine';

export default function FlorenceMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'left', width: '100%', maxWidth: 720 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.06em', color, opacity: 0.7, margin: '0 0 18px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6.5vw, 4.4rem)', lineHeight: 1.1, color, margin: '0 0 24px' }}>
        {coupleNames}
      </h1>
      <FlorenceVine color={accent} opacity={0.5} width={160} height={32} />
    </div>
  );
}
