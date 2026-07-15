/**
 * HavanaMasthead — the "havana-deco" layout's hero: symmetric Art Deco
 * composition, a HavanaSunburst fanning quietly behind the names — film-
 * poster energy kept to hairline weight, never a filled badge.
 */
import React from 'react';
import HavanaSunburst from './HavanaSunburst';

export default function HavanaMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ position: 'relative', textAlign: 'center', width: '100%', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: -16, opacity: 0.85 }}>
        <HavanaSunburst color={accent} opacity={0.4} width={160} height={80} />
      </div>
      <div style={{ position: 'relative' }}>
        {kicker && (
          <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.12em', color, opacity: 0.75, margin: '0 0 18px' }}>
            {kicker}
          </p>
        )}
        <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.3rem, 6vw, 4.2rem)', lineHeight: 1.12, color, margin: 0 }}>
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
