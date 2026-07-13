/**
 * MykonosSectionMark — the "mykonos-whitewash" layout's section opener: a
 * small CubeBlock beside a minimal kicker, opening Story/Celebration/
 * RSVP sections with the same flat colour-block architecture as
 * MykonosMasthead.
 */
import React from 'react';
import CubeBlock from './CubeBlock';

export default function MykonosSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 48 }}>
      <CubeBlock color={accent} width={28} height={28} />
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color,
            opacity: 0.55,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  );
}
