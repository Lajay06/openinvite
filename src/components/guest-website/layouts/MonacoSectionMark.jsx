/**
 * MonacoSectionMark — the "monaco-marina" layout's section opener: a
 * kicker beside a small MonacoMast mark, opening Story/Celebration/RSVP
 * sections.
 */
import React from 'react';
import { ROW_MARK_ROOT } from './markAnchor';
import MonacoMast from './MonacoMast';

export default function MonacoSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...ROW_MARK_ROOT, gap: 16, marginBottom: 48 }}>
      <MonacoMast color={accent} opacity={0.5} width={26} height={20} style={{ flexShrink: 0 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', color, opacity: 0.7, margin: 0 }}>
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
MonacoSectionMark.anchor = 'center';
