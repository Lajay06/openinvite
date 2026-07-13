/**
 * ParisMasthead — the "paris-couture" layout's hero treatment: a fashion
 * -plate caption card, framed top and bottom by a fine full-width
 * HairlineRule, with a small centred kicker and the couple's names set
 * in a high-contrast Didot-like serif, centred, inside generous
 * structured whitespace. The framing (a rule above AND below) is what
 * distinguishes this from MinimalMasthead's single hairline beneath the
 * kicker — a caption card, not just a quiet centred mark.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function ParisMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 680, margin: '0 auto' }}>
      <HairlineRule color={color} opacity={0.3} width="100%" thickness={1} style={{ marginBottom: 28 }} />

      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color,
            opacity: 0.6,
            margin: '0 0 24px',
          }}
        >
          {kicker}
        </p>
      )}

      <h1
        style={{
          fontFamily: typography.headingFont,
          fontWeight: typography.headingWeight,
          fontSize: 'clamp(2.75rem, 7vw, 5.25rem)',
          lineHeight: 1.05,
          letterSpacing: '0.01em',
          color,
          margin: '0 0 28px',
        }}
      >
        {coupleNames}
      </h1>

      <HairlineRule color={color} opacity={0.3} width="100%" thickness={1} />
    </div>
  );
}
