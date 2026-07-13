/**
 * CapeTownSectionMark — the "capetown-estate" layout's section opener: a
 * calm kicker + VineRule, opening Story/Celebration/RSVP sections with
 * the same unhurried, left-aligned warmth as CapeTownMasthead.
 */
import React from 'react';
import VineRule from './VineRule';

export default function CapeTownSectionMark({ kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: 'left', marginBottom: 56 }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.12em',
            color,
            opacity: 0.6,
            margin: '0 0 18px',
          }}
        >
          {kicker}
        </p>
      )}
      <VineRule color={color} opacity={0.5} style={{ maxWidth: 180 }} />
    </div>
  );
}
