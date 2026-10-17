/**
 * EdinburghSectionMark — the "edinburgh-estate" layout's section opener: a
 * kicker above a small EdinburghThistle mark, opening Story/Celebration/
 * RSVP sections.
 */
import React from 'react';
import { STACKED_MARK_ROOT } from './markAnchor';
import EdinburghThistle from './EdinburghThistle';

export default function EdinburghSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...STACKED_MARK_ROOT, marginBottom: 48 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </Tag>
      )}
      <EdinburghThistle color={accent} opacity={0.5} size={26} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two), and every mark now sits on the page's center axis
// (Batch 2, layout parity: see markAnchor.js). The guard measures the painted
// mark and asserts it agrees with this declaration.
EdinburghSectionMark.anchor = 'center';
