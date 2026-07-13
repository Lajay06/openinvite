/**
 * MykonosFooter — the "mykonos-whitewash" layout's closing mark: a row of
 * items, each preceded by a tiny solid CubeBlock marker instead of a
 * drawn rule — negative space itself is the separator between them,
 * matching "heavy negative space" rather than any line-based divider
 * every other layout uses.
 */
import React from 'react';
import CubeBlock from './CubeBlock';

export default function MykonosFooter({ lines, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 56 }}>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <CubeBlock color={accent} width={10} height={10} style={{ marginTop: 6 }} />
            <div>
              <p
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color,
                  opacity: 0.5,
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
          </div>
        );
      })}
    </div>
  );
}
