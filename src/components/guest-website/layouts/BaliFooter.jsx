/**
 * BaliFooter — the "bali-organic" layout's closing mark: date/RSVP lines
 * laid out easily side by side (wrapping naturally on narrow screens),
 * separated by a WaveDivider rather than a straight column rule — gentle
 * and unhurried, matching the masthead's flowing warmth.
 */
import React from 'react';
import WaveDivider from './WaveDivider';

export default function BaliFooter({ lines, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <div key={i} style={{ minWidth: 160 }}>
            {i > 0 && <WaveDivider color={color} opacity={0.3} height={14} style={{ maxWidth: 100, marginBottom: 16 }} />}
            <p
              style={{
                fontFamily: typography.bodyFont,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.14em',
                color,
                opacity: 0.55,
                margin: '0 0 8px',
              }}
            >
              {line.label}
            </p>
            <Tag
              href={line.href}
              style={{
                fontFamily: typography.headingFont,
                fontSize: 'clamp(1.1rem, 2.4vw, 1.5rem)',
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
