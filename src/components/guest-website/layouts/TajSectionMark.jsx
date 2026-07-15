/**
 * TajSectionMark — the "taj-pavilion" layout's section opener: a kicker
 * beside a small TajArch mark, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import TajArch from './TajArch';

export default function TajSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
      <TajArch color={accent} opacity={0.5} width={36} height={30} style={{ flexShrink: 0 }} />
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.7, margin: 0 }}>
          {kicker}
        </p>
      )}
    </div>
  );
}
