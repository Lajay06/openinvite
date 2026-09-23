/**
 * CapeTownSectionMark — the "capetown-estate" layout's section opener: a
 * calm kicker + VineRule, opening Story/Celebration/RSVP sections with
 * the same unhurried, left-aligned warmth as CapeTownMasthead.
 */
import React from 'react';
import VineRule from './VineRule';

export default function CapeTownSectionMark({ kicker, theme, typography, textColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'left', marginBottom: 56 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
      )}
      <VineRule color={color} opacity={0.5} style={{ maxWidth: 180 }} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
CapeTownSectionMark.anchor = 'left';
