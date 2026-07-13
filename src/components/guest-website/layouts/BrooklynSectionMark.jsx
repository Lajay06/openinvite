/**
 * BrooklynSectionMark — the "brooklyn-offgrid" layout's section opener: a
 * small bold-tracked kicker beside a short, thick TicketStub rule (never a
 * thin hairline) — direct and confident, opens Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import TicketStub from './TicketStub';

export default function BrooklynSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
      <TicketStub color={accent} width={48} height={10} />
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color,
            opacity: 0.7,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
    </div>
  );
}
