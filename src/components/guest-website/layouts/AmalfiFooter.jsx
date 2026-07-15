/**
 * AmalfiFooter — the "amalfi-citrus" layout's closing mark: an airy row of
 * columns separated by vertical AmalfiWave dividers, collapsing to stacked
 * rows with horizontal waves on narrow screens.
 */
import React, { useId } from 'react';
import AmalfiWave from './AmalfiWave';

export default function AmalfiFooter({ columns, theme, typography, textColor, accentColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `amalfi-footer-${uid}`;
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const count = columns.length;

  return (
    <div className={className}>
      <style>{`
        .${className} { display: grid; grid-template-columns: repeat(${count}, 1fr); gap: 0 28px; }
        .${className} .amalfi-col { text-align: center; }
        .${className} .amalfi-rule { display: flex; justify-content: center; margin: 0 0 14px; }
        @media (max-width: 640px) {
          .${className} { grid-template-columns: 1fr; row-gap: 28px; }
        }
      `}</style>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} className="amalfi-col">
            <div className="amalfi-rule"><AmalfiWave color={accent} opacity={0.5} width={70} height={16} /></div>
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color, opacity: 0.6, margin: '0 0 10px' }}>
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
