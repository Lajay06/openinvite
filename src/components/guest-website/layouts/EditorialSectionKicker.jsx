/**
 * EditorialSectionKicker — the small "Nº — label" line + fine woven rule
 * used to open a section under the "editorial-masthead" layout. Shared by
 * every page component that opts into this layout, so the kicker+rule
 * treatment reads as one consistent system across Home/Story/
 * Celebration/RSVP rather than four one-off implementations.
 */
import React from 'react';
import ZelligeDivider from './ZelligeDivider';
import { PAGE_ANCHOR } from './markAnchor';

export default function EditorialSectionKicker({ kicker, theme, typography, align = PAGE_ANCHOR, textColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  return (
    <div data-oi-anchor-root="" style={{ textAlign: align, marginBottom: 40 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
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

// THE PAGE ANCHOR. `align` defaults to the shared page anchor (center, Batch 2,
// layout parity: see markAnchor.js), so every page that renders this kicker
// without the prop sits on the same axis as the other nineteen universes.
EditorialSectionKicker.anchor = 'center';
