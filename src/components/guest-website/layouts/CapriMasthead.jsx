/**
 * CapriMasthead — the "capri-citrus" layout's hero treatment: a bright
 * CitrusScallop rule beneath a warm kicker, then the couple's names set
 * large in a lively, characterful serif, centred — sun-drenched and
 * buoyant rather than quiet, unlike every hairline/woven-quiet masthead
 * elsewhere.
 */
import React from 'react';
import CitrusScallop from './CitrusScallop';

export default function CapriMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 720, margin: '0 auto' }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color,
            opacity: 0.75,
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
          fontSize: 'clamp(2.5rem, 7vw, 4.75rem)',
          lineHeight: 1.1,
          color,
          margin: '0 0 28px',
        }}
      >
        {coupleNames}
      </h1>

      <CitrusScallop color={accent} bumpSize={7} style={{ maxWidth: 220, margin: '0 auto' }} />
    </div>
  );
}
