/**
 * TulumSectionMark — the "tulum-horizon" layout's section opener: a small
 * SunRayArc above a quiet kicker, opening Story/Celebration/RSVP sections
 * with the same sunrise line the masthead carries.
 */
import React from 'react';
import { STACKED_MARK_ROOT } from './markAnchor';
import SunRayArc from './SunRayArc';

export default function TulumSectionMark({ kicker, theme, typography, textColor, accentColor, as: Tag = 'p' }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  return (
    <div data-oi-anchor-root="" style={{ ...STACKED_MARK_ROOT, marginBottom: 48 }}>
      <SunRayArc color={accent} opacity={0.55} width={64} height={16} style={{ marginBottom: 14 }} />
      {kicker && (
        <Tag data-oi-anchor="mark" className="wb-body-face" style={{ fontFamily: typography.bodyFont, fontSize: 12.5, fontWeight: 500, color, opacity: 0.7, margin: 0 }}>
          {kicker}
        </Tag>
      )}
    </div>
  );
}

// THE PAGE ANCHOR. Every mark sits on the page's center axis (Batch 2, layout
// parity: see markAnchor.js). The guard measures the painted mark and asserts
// it agrees with this declaration.
TulumSectionMark.anchor = 'center';
