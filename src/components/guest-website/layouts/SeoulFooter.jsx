/**
 * SeoulFooter — the "seoul-glass" layout's closing mark: a soft, modern
 * card row with subtle rounded dividers — the most "contemporary UI"-
 * feeling footer of the set, still 0px card radius per the design system.
 */
import React, { useId } from 'react';

export default function SeoulFooter({ columns, theme, typography, textColor, accentColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `seoul-footer-${uid}`;
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const count = columns.length;

  return (
    <div className={className}>
      <style>{`
        .${className} { display: grid; grid-template-columns: repeat(${count}, 1fr); gap: 20px; }
        .${className} .seoul-col { padding: 20px; background: ${accent}14; text-align: center; }
        @media (max-width: 640px) {
          .${className} { grid-template-columns: 1fr; }
        }
      `}</style>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} className="seoul-col">
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color, opacity: 0.6, margin: '0 0 8px' }}>
              {col.label}
            </p>
            <Tag href={col.href} style={{ fontFamily: typography.headingFont, fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)', color, textDecoration: 'none', display: 'inline-block' }}>
              {col.value}
            </Tag>
          </div>
        );
      })}
    </div>
  );
}
