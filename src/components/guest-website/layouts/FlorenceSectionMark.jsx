/**
 * FlorenceSectionMark — the "florence-editorial" layout's section opener:
 * a kicker above a loose FlorenceVine flourish, opening Story/Celebration/
 * RSVP sections.
 */
import React from 'react';
import FlorenceVine from './FlorenceVine';

export default function FlorenceSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <Tag className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.06em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </Tag>
      )}
      <FlorenceVine color={accent} opacity={0.45} width={110} height={24} />
    </div>
  );
}
