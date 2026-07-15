/**
 * AmalfiSectionMark — the "amalfi-citrus" layout's section opener: a quiet
 * kicker above an AmalfiWave rule, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import AmalfiWave from './AmalfiWave';

export default function AmalfiSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </p>
      )}
      <AmalfiWave color={accent} opacity={0.5} width={100} height={20} />
    </div>
  );
}
