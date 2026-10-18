/**
 * KyotoSectionMark — the "kyoto-vertical" layout's section opener: a small
 * ensō mark + tiny wide-tracked kicker opening Story/Celebration/RSVP
 * sections. It was placed left, asymmetrically, after the vertical masthead;
 * it now sits on the page's center axis like every other universe's mark
 * (Batch 2, layout parity, see markAnchor.js). The masthead keeps its
 * asymmetry.
 */
import React from 'react';
import { STACKED_MARK_ROOT } from './markAnchor';
import EnsoRing from './EnsoRing';

export default function KyotoSectionMark({ kicker, theme, typography, textColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  return (
    <div data-oi-anchor-root="" style={{ ...STACKED_MARK_ROOT, marginBottom: 64 }}>
      <EnsoRing color={color} opacity={0.5} size={22} style={{ marginBottom: 16 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color,
            opacity: 0.55,
            margin: 0,
          }}
        >
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
KyotoSectionMark.anchor = 'center';
