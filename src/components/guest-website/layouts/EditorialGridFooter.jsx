/**
 * EditorialGridFooter — the "editorial-masthead" layout's structured footer:
 * a row of columns (date / venue / an RSVP call-to-action, etc.) separated
 * by fine woven-pattern rules, collapsing to a stacked column with
 * horizontal rules on narrow screens.
 *
 * Generic like EditorialMasthead — takes `columns` (an array of
 * { label, value, href? }) plus theme/typography, so any universe on this
 * layout can supply its own content and column count.
 */
import React, { useId } from 'react';
import ZelligeDivider from './ZelligeDivider';

export default function EditorialGridFooter({ columns, theme, typography, textColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `ed-footer-${uid}`;
  const color = textColor || theme.lightText;
  const count = columns.length;

  return (
    <div className={className} style={{ width: '100%' }}>
      <style>{`
        .${className} { display: grid; grid-template-columns: repeat(${count}, 1fr); align-items: stretch; }
        .${className} .ed-footer-col { padding: 0 28px; position: relative; }
        .${className} .ed-footer-col:first-child { padding-left: 0; }
        .${className} .ed-footer-col:last-child { padding-right: 0; }
        .${className} .ed-footer-rule-v { position: absolute; top: 4px; bottom: 4px; left: 0; }
        @media (max-width: 720px) {
          .${className} { grid-template-columns: 1fr; row-gap: 28px; }
          .${className} .ed-footer-col { padding: 0 !important; }
          .${className} .ed-footer-rule-v { display: none; }
          .${className} .ed-footer-rule-h { display: block !important; }
        }
      `}</style>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} className="ed-footer-col">
            {i > 0 && (
              <ZelligeDivider
                color={color}
                opacity={0.4}
                orientation="vertical"
                width={14}
                className="ed-footer-rule-v"
                style={{ position: 'absolute', top: 4, bottom: 4, left: 0 }}
              />
            )}
            {i > 0 && (
              <div className="ed-footer-rule-h" style={{ display: 'none', marginBottom: 20 }}>
                <ZelligeDivider color={color} opacity={0.4} height={14} />
              </div>
            )}
            <p
              style={{
                fontFamily: typography.bodyFont,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color,
                opacity: 0.6,
                margin: '0 0 10px',
              }}
            >
              {col.label}
            </p>
            <Tag
              href={col.href}
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.05rem, 2.2vw, 1.5rem)',
                color,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {col.value}
            </Tag>
          </div>
        );
      })}
    </div>
  );
}
