/**
 * BaliSectionMark — the "bali-organic" layout's section opener: a small
 * LeafCurve accent + warm kicker, opens Story/Celebration/RSVP sections
 * with the same easy, flowing feel as BaliMasthead.
 */
import React from 'react';
import LeafCurve from './LeafCurve';

export default function BaliSectionMark({ kicker, theme, typography, textColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'left', marginBottom: 48 }}>
      <LeafCurve color={color} opacity={0.55} size={26} style={{ marginBottom: 14 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
BaliSectionMark.anchor = 'left';
