/**
 * ParisSectionMark — the "paris-couture" layout's section opener: a thin
 * full-width rule above a small centred kicker, opening Story/
 * Celebration/RSVP sections with the same fashion-plate framing as
 * ParisMasthead.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function ParisSectionMark({ kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
      <HairlineRule color={color} opacity={0.3} width="100%" thickness={1} style={{ marginBottom: 20 }} />
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
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  );
}
