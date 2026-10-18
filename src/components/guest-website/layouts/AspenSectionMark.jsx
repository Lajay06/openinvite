/**
 * AspenSectionMark — the "aspen-lodge" layout's section opener: a small
 * AspenPine mark above the kicker, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import { STACKED_MARK_ROOT } from './markAnchor';
import AspenPine from './AspenPine';

export default function AspenSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...STACKED_MARK_ROOT, marginBottom: 48 }}>
      <AspenPine color={accent} opacity={0.5} size={26} style={{ marginBottom: 14 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: 0 }}>
          {kicker}
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two), and every mark now sits on the page's center axis
// (Batch 2, layout parity: see markAnchor.js). The guard measures the painted
// mark and asserts it agrees with this declaration.
AspenSectionMark.anchor = 'center';
