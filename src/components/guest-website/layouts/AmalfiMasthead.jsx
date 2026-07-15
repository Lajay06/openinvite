/**
 * AmalfiMasthead — the "amalfi-citrus" layout's hero: airy, generous
 * whitespace, names set large in Bodoni Moda's high-contrast Didone, an
 * AmalfiWave rule beneath. Cooler and more spacious than Capri's buoyant
 * centred masthead — "bright" reads as light and open, not warm and busy.
 */
import React from 'react';
import AmalfiWave from './AmalfiWave';

export default function AmalfiMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 760, margin: '0 auto' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.7, margin: '0 0 24px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.6rem, 7vw, 5rem)', lineHeight: 1.08, color, margin: '0 0 32px' }}>
        {coupleNames}
      </h1>
      <AmalfiWave color={accent} opacity={0.55} width={140} height={28} style={{ margin: '0 auto' }} />
    </div>
  );
}
