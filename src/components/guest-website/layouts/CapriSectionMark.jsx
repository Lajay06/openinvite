/**
 * CapriSectionMark — the "capri-citrus" layout's section opener: a warm
 * kicker above a bright CitrusScallop rule, opening Story/Celebration/
 * RSVP sections.
 */
import React from 'react';
import CitrusScallop from './CitrusScallop';

export default function CapriSectionMark({ kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div style={{ textAlign: 'left', marginBottom: 48 }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.08em',
            color,
            opacity: 0.7,
            margin: '0 0 14px',
          }}
        >
          {kicker}
        </p>
      )}
      <CitrusScallop color={accent} bumpSize={6} style={{ maxWidth: 120 }} />
    </div>
  );
}
