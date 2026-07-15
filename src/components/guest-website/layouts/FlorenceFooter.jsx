/**
 * FlorenceFooter — the "florence-editorial" layout's closing mark: a
 * left-aligned editorial column list, each opening with a small
 * FlorenceVine flourish — a sketched, unfussy Tuscan feel.
 */
import React from 'react';
import FlorenceVine from './FlorenceVine';

export default function FlorenceFooter({ columns, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, maxWidth: 720 }}>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} style={{ minWidth: 140 }}>
            {i > 0 && <FlorenceVine color={accent} opacity={0.4} width={80} height={18} style={{ marginBottom: 10 }} />}
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color, opacity: 0.6, margin: '0 0 8px' }}>
              {col.label}
            </p>
            <Tag href={col.href} style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)', color, textDecoration: 'none', display: 'inline-block' }}>
              {col.value}
            </Tag>
          </div>
        );
      })}
    </div>
  );
}
