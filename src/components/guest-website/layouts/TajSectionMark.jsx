/**
 * TajSectionMark — the "taj-pavilion" layout's section opener: a kicker
 * beside a small TajArch mark, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import { ROW_MARK_ROOT } from './markAnchor';
import TajArch from './TajArch';

export default function TajSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...ROW_MARK_ROOT, gap: 16, marginBottom: 48 }}>
      <TajArch color={accent} opacity={0.5} width={36} height={30} style={{ flexShrink: 0 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.7, margin: 0 }}>
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
TajSectionMark.anchor = 'center';
