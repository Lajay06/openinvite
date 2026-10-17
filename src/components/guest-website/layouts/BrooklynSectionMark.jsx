/**
 * BrooklynSectionMark — the "brooklyn-offgrid" layout's section opener: a
 * small bold-tracked kicker beside a short, thick TicketStub rule (never a
 * thin hairline) — direct and confident, opens Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import { ROW_MARK_ROOT } from './markAnchor';
import TicketStub from './TicketStub';

export default function BrooklynSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...ROW_MARK_ROOT, gap: 16, marginBottom: 48 }}>
      <TicketStub color={accent} width={48} height={10} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face"
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
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two), and every mark now sits on the page's center axis
// (Batch 2, layout parity: see markAnchor.js). The guard measures the painted
// mark and asserts it agrees with this declaration.
BrooklynSectionMark.anchor = 'center';
