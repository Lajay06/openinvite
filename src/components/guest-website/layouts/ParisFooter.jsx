/**
 * ParisFooter — the "paris-couture" layout's closing mark: a thin
 * full-width rule above a structured, evenly-spaced row of columns
 * (date/venue/RSVP) — a fashion-plate caption legend, framed the same
 * way as ParisMasthead rather than divided by rules between columns.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function ParisFooter({ columns, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ width: '100%' }}>
      <HairlineRule color={color} opacity={0.3} width="100%" thickness={1} style={{ marginBottom: 32 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 48 }}>
        {columns.map((col, i) => {
          const Tag = col.href ? 'a' : 'div';
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color,
                  opacity: 0.55,
                  margin: '0 0 10px',
                }}
              >
                {col.label}
              </p>
              <Tag
                href={col.href}
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)',
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
    </div>
  );
}
