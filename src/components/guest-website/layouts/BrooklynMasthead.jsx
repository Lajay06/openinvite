/**
 * BrooklynMasthead — the "brooklyn-offgrid" layout's hero treatment: a
 * vertical sideways kicker running up the left edge (gig-poster
 * convention), the couple's names set huge and shifted off-centre to the
 * right (never centred, never symmetric), and a bold TicketStub rule
 * underneath instead of a thin hairline or woven pattern. Brooklyn's
 * restraint is structural — a lot of flat colour and off-grid placement —
 * not textural.
 */
import React from 'react';
import TicketStub from './TicketStub';

export default function BrooklynMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, width: '100%' }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color,
            opacity: 0.65,
            margin: 0,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            flexShrink: 0,
          }}
        >
          {kicker}
        </p>
      )}

      <div style={{ marginLeft: 'auto', textAlign: 'right', maxWidth: '85%' }}>
        <h1
          style={{
            fontFamily: typography.headingFont,
            fontWeight: typography.headingWeight,
            fontSize: 'clamp(3rem, 11vw, 8rem)',
            lineHeight: 0.9,
            letterSpacing: '0.01em',
            color,
            margin: '0 0 20px',
          }}
        >
          {coupleNames}
        </h1>
        <TicketStub color={accent} width="100%" height={12} style={{ marginLeft: 'auto' }} />
      </div>
    </div>
  );
}
