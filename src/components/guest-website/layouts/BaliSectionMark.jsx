/**
 * BaliSectionMark — the "bali-organic" layout's section opener: a small
 * LeafCurve accent + warm kicker, opens Story/Celebration/RSVP sections
 * with the same easy, flowing feel as BaliMasthead.
 */
import React from 'react';
import LeafCurve from './LeafCurve';

export default function BaliSectionMark({ kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      <LeafCurve color={color} opacity={0.55} size={26} style={{ marginBottom: 14 }} />
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.14em',
            color,
            opacity: 0.6,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  );
}
