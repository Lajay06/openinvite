/**
 * KyotoFooter — the "kyoto-vertical" layout's closing mark: an asymmetric,
 * left-aligned column of lines (date, an RSVP-style link) each separated
 * by a short vertical rule rather than a horizontal one — keeping the
 * vertical rhythm going all the way to the bottom of the page instead of
 * resolving into a centred or gridded footer.
 */
import React from 'react';
import VerticalRule from './VerticalRule';

export default function KyotoFooter({ lines, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ maxWidth: 340 }}>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: i < lines.length - 1 ? 36 : 0 }}>
            <VerticalRule color={color} opacity={0.2} height={40} thickness={1} style={{ flexShrink: 0, marginTop: 4 }} />
            <div>
              <p
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color,
                  opacity: 0.5,
                  margin: '0 0 10px',
                }}
              >
                {line.label}
              </p>
              <Tag
                href={line.href}
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.05rem, 2vw, 1.4rem)',
                  color,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {line.value}
              </Tag>
            </div>
          </div>
        );
      })}
    </div>
  );
}
