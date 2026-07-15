/**
 * TajMasthead — the "taj-pavilion" layout's hero: the names framed inside
 * a thin TajArch outline — the arch as a literal framing device, still
 * hairline-weight only (never a filled/ornamented border).
 */
import React from 'react';
import TajArch from './TajArch';

export default function TajMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 560, margin: '0 auto', padding: '48px 32px 32px' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' }}>
        <TajArch color={accent} opacity={0.4} width={'100%'} height={'100%'} style={{ maxWidth: 480 }} />
      </div>
      <div style={{ position: 'relative' }}>
        {kicker && (
          <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.75, margin: '0 0 18px' }}>
            {kicker}
          </p>
        )}
        <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.1rem, 5.5vw, 3.6rem)', lineHeight: 1.15, color, margin: 0 }}>
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
