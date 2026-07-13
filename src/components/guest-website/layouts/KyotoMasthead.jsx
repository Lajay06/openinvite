/**
 * KyotoMasthead — the "kyoto-vertical" layout's hero treatment: an
 * asymmetric column held to roughly a third of the width, a brushed
 * ensō mark, a vertical rule as the spine, and the couple's names set one
 * per line with generous vertical rhythm (deliberate air between lines,
 * not a tight couple) — the rest of the composition is left as vast,
 * uninterrupted negative space (ma). Left-aligned and asymmetric, never
 * centred like MinimalMasthead, never broken diagonally like
 * EditorialMasthead.
 */
import React from 'react';
import EnsoRing from './EnsoRing';
import VerticalRule from './VerticalRule';

function splitCoupleNames(coupleNames) {
  const parts = (coupleNames || '').split(/\s*&\s*|\s+and\s+/i).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' & ')];
  return [coupleNames || '', ''];
}

export default function KyotoMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  const [name1, name2] = splitCoupleNames(coupleNames);

  return (
    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', maxWidth: 460 }}>
      <VerticalRule color={color} opacity={0.22} height={120} style={{ flexShrink: 0, marginTop: 6 }} />
      <div>
        <EnsoRing color={color} opacity={0.55} size={26} style={{ marginBottom: 20 }} />
        {kicker && (
          <p
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color,
              opacity: 0.55,
              margin: '0 0 40px',
            }}
          >
            {kicker}
          </p>
        )}
        <h1
          style={{
            fontFamily: typography.headingFont,
            fontWeight: typography.headingWeight,
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            lineHeight: 2,
            letterSpacing: '0.01em',
            color,
            margin: 0,
          }}
        >
          <span style={{ display: 'block' }}>{name1}</span>
          {name2 && <span style={{ display: 'block' }}>{name2}</span>}
        </h1>
      </div>
    </div>
  );
}
