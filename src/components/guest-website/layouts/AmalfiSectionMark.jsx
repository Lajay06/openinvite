/**
 * AmalfiSectionMark — the "amalfi-citrus" layout's section opener: a quiet
 * kicker above an AmalfiWave rule, opening Story/Celebration/RSVP sections.
 */
import React from 'react';
import { STACKED_MARK_ROOT } from './markAnchor';
import AmalfiWave from './AmalfiWave';

export default function AmalfiSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...STACKED_MARK_ROOT, marginBottom: 48 }}>
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, letterSpacing: '0.1em', color, opacity: 0.65, margin: '0 0 14px' }}>
          {kicker}
        </Tag>
      )}
      <AmalfiWave color={accent} opacity={0.5} width={100} height={20} />
    </div>
  );
}

// THE PAGE ANCHOR. Body copy on a page follows its mark rather than fighting
// it (Batch 2, phase two), and every mark now sits on the page's center axis
// (Batch 2, layout parity: see markAnchor.js). The guard measures the painted
// mark and asserts it agrees with this declaration.
AmalfiSectionMark.anchor = 'center';
