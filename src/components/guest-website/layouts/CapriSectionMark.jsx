/**
 * CapriSectionMark — the "capri-citrus" layout's section opener: a warm
 * kicker above a bright CitrusScallop rule, opening Story/Celebration/
 * RSVP sections.
 */
import React from 'react';
import CitrusScallop from './CitrusScallop';

export default function CapriSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color,
            opacity: 0.7,
            margin: '0 0 14px',
          }}
        >
          {kicker}
        </Tag>
      )}
      <CitrusScallop color={accent} bumpSize={6} style={{ maxWidth: 120 }} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
CapriSectionMark.anchor = 'left';
