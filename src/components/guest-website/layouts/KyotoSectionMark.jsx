/**
 * KyotoSectionMark — the "kyoto-vertical" layout's section opener: a small
 * left-aligned ensō mark + tiny wide-tracked kicker, asymmetrically placed
 * (never centred) to open Story/Celebration/RSVP sections, consistent with
 * the vertical-rhythm masthead's own asymmetric restraint.
 */
import React from 'react';
import EnsoRing from './EnsoRing';

export default function KyotoSectionMark({ kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: 'left', marginBottom: 64 }}>
      <EnsoRing color={color} opacity={0.5} size={22} style={{ marginBottom: 16 }} />
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color,
            opacity: 0.55,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  );
}
