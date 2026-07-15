/**
 * HavanaFooter — the "havana-deco" layout's closing mark: a symmetric row
 * of columns with a thin double-rule frame top and bottom, film-poster
 * credits-block feel.
 */
import React, { useId } from 'react';

export default function HavanaFooter({ columns, theme, typography, textColor, accentColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `havana-footer-${uid}`;
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const count = columns.length;

  return (
    <div className={className} style={{ borderTop: `1px solid ${accent}55`, borderBottom: `1px solid ${accent}55`, padding: '24px 0' }}>
      <style>{`
        .${className} .havana-grid { display: grid; grid-template-columns: repeat(${count}, 1fr); }
        @media (max-width: 640px) {
          .${className} .havana-grid { grid-template-columns: 1fr; row-gap: 22px; }
        }
      `}</style>
      <div className="havana-grid">
        {columns.map((col, i) => {
          const Tag = col.href ? 'a' : 'div';
          return (
            <div key={i} style={{ textAlign: 'center' }}>
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
    </div>
  );
}
