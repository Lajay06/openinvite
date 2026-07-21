/**
 * BaliMasthead — the "bali-organic" layout's hero treatment: a small
 * flowing LeafCurve accent, a warm kicker, the couple's names set large in
 * a soft humanist serif with relaxed, easy alignment (left, generous
 * measure — not deeply centred like London, not asymmetrically broken like
 * Marrakech), and a WaveDivider beneath instead of a straight rule.
 */
import React from 'react';
import LeafCurve from './LeafCurve';
import WaveDivider from './WaveDivider';

export default function BaliMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ textAlign: 'left', width: '100%', maxWidth: 780 }}>
      <LeafCurve color={color} opacity={0.6} size={32} style={{ marginBottom: 20 }} />

      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.14em',
            color,
            opacity: 0.65,
            margin: '0 0 20px',
          }}
        >
          {kicker}
        </p>
      )}

      <h1
        style={{
          fontFamily: typography.headingFont,
          fontWeight: typography.headingWeight,
          fontSize: 'clamp(2.5rem, 7vw, 5rem)',
          lineHeight: 1.12,
          letterSpacing: '-0.005em',
          color,
          margin: '0 0 32px',
        }}
      >
        {coupleNames}
      </h1>

      <WaveDivider color={color} opacity={0.35} height={18} style={{ maxWidth: 200 }} />
    </div>
  );
}
