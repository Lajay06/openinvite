/**
 * TulumMasthead — the "tulum-horizon" layout's hero: the kicker, the names in
 * Fraunces, and a SunRayArc rising off the line beneath them. Centered and
 * unhurried, with nothing on it that is not the names. Tulum was the one
 * universe with no layout key, so it fell through to the default hero; this
 * gives it a masthead of its own, built from the motif it already had.
 */
import React from 'react';
import SunRayArc from './SunRayArc';

export default function TulumMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 720, margin: '0 auto' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.75, margin: '0 0 24px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.5rem, 7vw, 4.8rem)', lineHeight: 1.1, color, margin: '0 0 28px' }}>
        {coupleNames}
      </h1>
      <SunRayArc color={accent} opacity={0.6} width={150} height={38} style={{ margin: '0 auto' }} />
    </div>
  );
}
