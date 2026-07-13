/**
 * BrooklynFooter — the "brooklyn-offgrid" layout's closing mark: an
 * off-grid two-column split (uneven widths, not a symmetric grid) with a
 * bold vertical TicketStub block between them instead of a hairline —
 * direct, confident, structural.
 */
import React from 'react';
import TicketStub from './TicketStub';

export default function BrooklynFooter({ lines, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;
  const uid = React.useId().replace(/[:]/g, '');
  const className = `bk-footer-${uid}`;

  return (
    <div className={className}>
      <style>{`
        .${className} { display: flex; align-items: stretch; gap: 28px; }
        @media (max-width: 640px) {
          .${className} { flex-direction: column; gap: 32px; }
          .${className} .bk-footer-rule { display: none; }
        }
      `}</style>
      {lines.map((line, i) => {
        const Tag = line.href ? 'a' : 'div';
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <TicketStub
                color={accent}
                width={10}
                height={64}
                className="bk-footer-rule"
                style={{ backgroundImage: `radial-gradient(circle at 50% 0, transparent 5px, ${accent} 5px)`, backgroundSize: '100% 12px', backgroundRepeat: 'repeat-y', flexShrink: 0 }}
              />
            )}
            <div style={{ flex: i === 0 ? '0 0 auto' : 1 }}>
              <p
                style={{
                  fontFamily: typography.bodyFont,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color,
                  opacity: 0.6,
                  margin: '0 0 10px',
                }}
              >
                {line.label}
              </p>
              <Tag
                href={line.href}
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: 'clamp(1.15rem, 2.6vw, 1.75rem)',
                  color,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {line.value}
              </Tag>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
