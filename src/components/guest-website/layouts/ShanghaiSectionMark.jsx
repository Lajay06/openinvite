/**
 * ShanghaiSectionMark — the "shanghai-glamour" layout's section opener: a
 * kicker above a small ShanghaiCloud mark, opening Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import ShanghaiCloud from './ShanghaiCloud';

export default function ShanghaiSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </Tag>
      )}
      <ShanghaiCloud color={accent} opacity={0.5} width={90} height={32} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two): the guard measures the painted mark and asserts it
// agrees with this declaration, so the two cannot drift apart unnoticed.
ShanghaiSectionMark.anchor = 'left';
