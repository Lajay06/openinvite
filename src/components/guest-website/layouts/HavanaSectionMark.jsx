/**
 * HavanaSectionMark — the "havana-deco" layout's section opener: a kicker
 * above a small HavanaSunburst mark, opening Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import HavanaSunburst from './HavanaSunburst';

export default function HavanaSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 600, letterSpacing: '0.12em', color, opacity: 0.7, margin: '0 0 14px' }}>
          {kicker}
        </p>
      )}
      <HavanaSunburst color={accent} opacity={0.45} width={70} height={36} />
    </div>
  );
}
