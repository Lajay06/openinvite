/**
 * MonacoMasthead — the "monaco-marina" layout's hero: a black/gold high-
 * contrast fashion-plate composition (nautical rather than Paris's caption-
 * card frame), MonacoMast mark beneath the names.
 */
import React from 'react';
import MonacoMast from './MonacoMast';

export default function MonacoMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 700, margin: '0 auto' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', color, opacity: 0.7, margin: '0 0 22px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6.5vw, 4.6rem)', lineHeight: 1.1, color, margin: '0 0 26px' }}>
        {coupleNames}
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <MonacoMast color={accent} opacity={0.55} width={70} height={50} />
      </div>
    </div>
  );
}
