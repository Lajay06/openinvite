/**
 * EditorialSectionKicker — the small "Nº — label" line + fine woven rule
 * used to open a section under the "editorial-masthead" layout. Shared by
 * every page component that opts into this layout, so the kicker+rule
 * treatment reads as one consistent system across Home/Story/
 * Celebration/RSVP rather than four one-off implementations.
 */
import React from 'react';
import ZelligeDivider from './ZelligeDivider';

export default function EditorialSectionKicker({ kicker, theme, typography, align = 'left', textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: align, marginBottom: 40 }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color,
            opacity: 0.65,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}
      <ZelligeDivider
        color={color}
        opacity={0.4}
        height={14}
        style={{ width: 72, margin: align === 'center' ? '16px auto 0' : '16px 0 0' }}
      />
    </div>
  );
}
