/**
 * CapeTownMasthead — the "capetown-estate" layout's hero treatment: a
 * calm kicker, a VineRule (a fine estate-stationery botanical rule), and
 * the couple's names set large in a grounded serif — left-aligned and
 * generously spaced, unhurried rather than centred-formal or
 * asymmetrically dramatic.
 */
import React from 'react';
import VineRule from './VineRule';

export default function CapeTownMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ textAlign: 'left', width: '100%', maxWidth: 760 }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.12em',
            color,
            opacity: 0.65,
            margin: '0 0 24px',
          }}
        >
          {kicker}
        </p>
      )}

      <VineRule color={color} opacity={0.55} style={{ maxWidth: 220, marginBottom: 32 }} />

      <h1
        style={{
          fontFamily: typography.headingFont,
          fontWeight: typography.headingWeight,
          fontSize: 'clamp(2.5rem, 6.5vw, 4.5rem)',
          lineHeight: 1.12,
          letterSpacing: '-0.01em',
          color,
          margin: 0,
        }}
      >
        {coupleNames}
      </h1>
    </div>
  );
}
