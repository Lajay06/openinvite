/**
 * CapriFooter — the "capri-citrus" layout's closing mark: a bright row of
 * columns (date/venue/RSVP) separated by vertical CitrusScallop dividers,
 * collapsing to stacked rows with horizontal scallops on narrow screens.
 */
import React, { useId } from 'react';
import CitrusScallop from './CitrusScallop';

export default function CapriFooter({ columns, theme, typography, textColor, accentColor }) {
  const uid = useId().replace(/[:]/g, '');
  const className = `capri-footer-${uid}`;
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const count = columns.length;

  return (
    <div className={className}>
      <style>{`
        .${className} { display: grid; grid-template-columns: repeat(${count}, 1fr); }
        .${className} .capri-col { padding: 0 24px; position: relative; text-align: center; }
        .${className} .capri-col:first-child { padding-left: 0; }
        .${className} .capri-col:last-child { padding-right: 0; }
        .${className} .capri-rule-v { position: absolute; top: 0; bottom: 0; left: 0; }
        .${className} .capri-rule-h { display: none; }
        @media (max-width: 640px) {
          .${className} { grid-template-columns: 1fr; row-gap: 28px; }
          .${className} .capri-col { padding: 0 !important; }
          .${className} .capri-rule-v { display: none; }
          .${className} .capri-rule-h { display: block; margin: 0 auto 20px; }
        }
      `}</style>
      {columns.map((col, i) => {
        const Tag = col.href ? 'a' : 'div';
        return (
          <div key={i} className="capri-col">
            {i > 0 && <CitrusScallop color={accent} orientation="vertical" bumpSize={6} className="capri-rule-v" />}
            {i > 0 && <CitrusScallop color={accent} orientation="horizontal" bumpSize={6} className="capri-rule-h" style={{ maxWidth: 100, margin: '0 auto 20px' }} />}
            <p style={{ fontFamily: typography.bodyFont, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color, opacity: 0.6, margin: '0 0 10px' }}>
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
