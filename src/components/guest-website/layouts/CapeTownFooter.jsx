/**
 * CapeTownFooter — the "capetown-estate" layout's closing mark: a calm,
 * left-aligned vertical stack (date, an RSVP-style link) each separated
 * by a VineRule — unhurried, estate-stationery warmth carried all the
 * way to the bottom of the page.
 */
import React from 'react';
import VineRule from './VineRule';

export default function CapeTownFooter({ lines, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ maxWidth: 360 }}>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <div key={i}>
            {i > 0 && <VineRule color={color} opacity={0.4} style={{ maxWidth: 160, margin: '28px 0' }} />}
            <p
              style={{
                fontFamily: typography.bodyFont,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.14em',
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
                fontSize: 'clamp(1.05rem, 2.2vw, 1.4rem)',
                color,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {line.value}
            </Tag>
          </div>
        );
      })}
    </div>
  );
}
