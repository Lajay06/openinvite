/**
 * EdinburghSectionMark — the "edinburgh-estate" layout's section opener: a
 * kicker above a small EdinburghThistle mark, opening Story/Celebration/
 * RSVP sections.
 */
import React from 'react';
import EdinburghThistle from './EdinburghThistle';

export default function EdinburghSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </p>
      )}
      <EdinburghThistle color={accent} opacity={0.5} size={26} />
    </div>
  );
}
