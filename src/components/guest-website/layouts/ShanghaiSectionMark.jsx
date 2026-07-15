/**
 * ShanghaiSectionMark — the "shanghai-glamour" layout's section opener: a
 * kicker above a small ShanghaiCloud mark, opening Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import ShanghaiCloud from './ShanghaiCloud';

export default function ShanghaiSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </p>
      )}
      <ShanghaiCloud color={accent} opacity={0.5} width={90} height={32} />
    </div>
  );
}
