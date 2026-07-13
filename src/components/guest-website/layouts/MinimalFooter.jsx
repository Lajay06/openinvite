/**
 * MinimalFooter — the "aman-minimal" layout's closing mark: a centred,
 * vertically stacked sequence (date, a hairline, an RSVP-style link) in a
 * narrow measure with generous space between each line — the quiet,
 * symmetric counterpart to EditorialGridFooter's horizontal column grid.
 * Takes `lines` (an array of { label, value, href? }) so any universe on
 * this layout can supply its own content and line count.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function MinimalFooter({ lines, theme, typography, textColor }) {
  const color = textColor || theme.lightText;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 480, margin: '0 auto' }}>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <div key={i}>
            {i > 0 && <HairlineRule color={color} opacity={0.18} width={32} style={{ margin: '32px auto' }} />}
            <p
              style={{
                fontFamily: typography.bodyFont,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.24em',
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
                fontSize: 'clamp(1.1rem, 2.4vw, 1.6rem)',
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
