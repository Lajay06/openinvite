/**
 * MonacoSectionMark — the "monaco-marina" layout's section opener: a
 * kicker beside a small MonacoMast mark, opening Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import MonacoMast from './MonacoMast';

export default function MonacoSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
      <MonacoMast color={accent} opacity={0.5} width={26} height={20} style={{ flexShrink: 0 }} />
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', color, opacity: 0.7, margin: 0 }}>
          {kicker}
        </p>
      )}
    </div>
  );
}
