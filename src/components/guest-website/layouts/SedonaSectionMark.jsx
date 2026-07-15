/**
 * SedonaSectionMark — the "sedona-mesa" layout's section opener: a kicker
 * above a SedonaContour rule, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import SedonaContour from './SedonaContour';

export default function SedonaSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.08em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </p>
      )}
      <SedonaContour color={accent} opacity={0.5} width={120} height={26} />
    </div>
  );
}
