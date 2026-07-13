/**
 * MykonosMasthead — the "mykonos-whitewash" layout's hero treatment: a
 * solid cobalt CubeBlock sitting beside a small kicker and the couple's
 * names set in a single clean sans-serif family (weight, not typeface,
 * carries the hierarchy) — a Bauhaus-flat colour-block composition held
 * inside vast surrounding whitespace. Architectural, not decorative:
 * the only ornament is the block's flat presence.
 */
import React from 'react';
import CubeBlock from './CubeBlock';

export default function MykonosMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, width: '100%' }}>
      <CubeBlock color={accent} width={64} height={64} style={{ display: 'block' }} />
      <div>
        {kicker && (
          <p
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color,
              opacity: 0.55,
              margin: '0 0 16px',
            }}
          >
            {kicker}
          </p>
        )}
        <h1
          style={{
            fontFamily: typography.headingFont,
            fontWeight: typography.headingWeight,
            fontSize: 'clamp(2.25rem, 6vw, 4rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color,
            margin: 0,
          }}
        >
          {coupleNames}
        </h1>
      </div>
    </div>
  );
}
