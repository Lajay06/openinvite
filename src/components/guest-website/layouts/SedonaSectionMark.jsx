/**
 * SedonaSectionMark — the "sedona-mesa" layout's section opener: a kicker
 * above a SedonaContour rule, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import SedonaContour from './SedonaContour';

export default function SedonaSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </Tag>
      )}
      <SedonaContour color={accent} opacity={0.5} width={120} height={26} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
SedonaSectionMark.anchor = 'left';
