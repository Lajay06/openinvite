/**
 * SeoulSectionMark — the "seoul-glass" layout's section opener: a kicker
 * beside a small SeoulOrb mark, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import SeoulOrb from './SeoulOrb';

export default function SeoulSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
      <SeoulOrb color={accent} opacity={0.5} size={28} style={{ flexShrink: 0 }} />
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', color, opacity: 0.65, margin: 0 }}>
          {kicker}
        </p>
      )}
    </div>
  );
}
