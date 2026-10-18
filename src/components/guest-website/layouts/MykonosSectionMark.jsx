/**
 * MykonosSectionMark — the "mykonos-whitewash" layout's section opener: a
 * small CubeBlock beside a minimal kicker, opening Story/Celebration/
 * RSVP sections with the same flat colour-block architecture as
 * MykonosMasthead.
 */
import React from 'react';
import { ROW_MARK_ROOT } from './markAnchor';
import CubeBlock from './CubeBlock';

export default function MykonosSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...ROW_MARK_ROOT, gap: 18, marginBottom: 48 }}>
      <CubeBlock color={accent} width={28} height={28} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two), and every mark now sits on the page's center axis
// (Batch 2, layout parity: see markAnchor.js). The guard measures the painted
// mark and asserts it agrees with this declaration.
MykonosSectionMark.anchor = 'center';
