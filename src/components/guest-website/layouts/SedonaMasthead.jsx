/**
 * SedonaMasthead — the "sedona-mesa" layout's hero: left-aligned (not
 * centred), an unpretentious desert-card composition, SedonaContour rule
 * beneath the names.
 */
import React from 'react';
import SedonaContour from './SedonaContour';

export default function SedonaMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'left', width: '100%', maxWidth: 680 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color, opacity: 0.7, margin: '0 0 20px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6.5vw, 4.4rem)', lineHeight: 1.1, color, margin: '0 0 26px' }}>
        {coupleNames}
      </h1>
      <SedonaContour color={accent} opacity={0.55} width={180} height={36} />
    </div>
  );
}
