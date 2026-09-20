/**
 * ParisSectionMark — the "paris-couture" layout's section opener: a thin
 * full-width rule above a small centred kicker, opening Story/
 * Celebration/RSVP sections with the same fashion-plate framing as
 * ParisMasthead.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function ParisSectionMark({ kicker, theme, typography, textColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'center', marginBottom: 56 }}>
      <HairlineRule color={color} opacity={0.3} width="100%" thickness={1} style={{ marginBottom: 20 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
ParisSectionMark.anchor = 'center';
