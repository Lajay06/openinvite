/**
 * SedonaFooter — the "sedona-mesa" layout's closing mark: left-aligned
 * stacked rows (not a centred grid), each opening with a small
 * SedonaContour rule — reads as a natural, unpretentious card, not a
 * formal table.
 */
import React from 'react';
import SedonaContour from './SedonaContour';

export default function SedonaFooter({ columns, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 420 }}>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i}>
            {i > 0 && <SedonaContour color={accent} opacity={0.4} width={100} height={20} style={{ marginBottom: 12 }} />}
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color, opacity: 0.6, margin: '0 0 8px' }}>
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
