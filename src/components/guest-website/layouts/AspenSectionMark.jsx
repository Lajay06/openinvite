/**
 * AspenSectionMark — the "aspen-lodge" layout's section opener: a small
 * AspenPine mark above the kicker, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import AspenPine from './AspenPine';

export default function AspenSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      <AspenPine color={accent} opacity={0.5} size={26} style={{ marginBottom: 14 }} />
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: 0 }}>
          {kicker}
        </p>
      )}
    </div>
  );
}
