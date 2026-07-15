/**
 * EdinburghFooter — the "edinburgh-estate" layout's closing mark: a formal
 * centred row of columns separated by thin vertical rules — a manor
 * invitation-card feel.
 */
import React, { useId } from 'react';

export default function EdinburghFooter({ columns, theme, typography, textColor, accentColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `edinburgh-footer-${uid}`;
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const count = columns.length;

  return (
    <div className={className}>
      <style>{`
        .${className} { display: grid; grid-template-columns: repeat(${count}, 1fr); }
        .${className} .edin-col { padding: 0 24px; text-align: center; border-left: 1px solid ${accent}55; }
        .${className} .edin-col:first-child { border-left: none; padding-left: 0; }
        .${className} .edin-col:last-child { padding-right: 0; }
        @media (max-width: 640px) {
          .${className} { grid-template-columns: 1fr; row-gap: 24px; }
          .${className} .edin-col { border-left: none; padding: 0 !important; }
        }
      `}</style>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} className="edin-col">
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color, opacity: 0.6, margin: '0 0 10px' }}>
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
