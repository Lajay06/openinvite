/**
 * MinimalMasthead — the "london-minimal" layout's hero treatment: a tiny,
 * wide-tracked kicker, a single hairline rule, then the couple's names set
 * large and quiet — centred and symmetric (unlike EditorialMasthead's
 * asymmetric two-line break), in a narrow measure with vast surrounding
 * whitespace. The luxury is what's removed: no woven pattern, no
 * asymmetric offset, no oversized numerals — just restraint.
 *
 * Generic like EditorialMasthead — takes theme/typography/copy as props so
 * any future universe opting into `layout: 'london-minimal'` can reuse this
 * with its own palette/type/kicker text.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

function splitCoupleNames(coupleNames) {
  const parts = (coupleNames || '').split(/\s*&\s*|\s+and\s+/i).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' & ')];
  return [coupleNames || '', ''];
}

export default function MinimalMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  const [name1, name2] = splitCoupleNames(coupleNames);

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 640, margin: '0 auto' }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color,
            opacity: 0.55,
            margin: '0 0 28px',
          }}
        >
          {kicker}
        </p>
      )}

      <HairlineRule color={color} opacity={0.22} width={40} style={{ margin: '0 auto 32px' }} />

      <h1
        style={{
          fontFamily: typography.headingFont,
          fontWeight: typography.headingWeight,
          fontSize: 'clamp(2.5rem, 6.5vw, 4.75rem)',
          lineHeight: 1.15,
          letterSpacing: '-0.005em',
          color,
          margin: 0,
        }}
      >
        {name2 ? (
          <>
            {name1} <span style={{ fontStyle: 'italic', opacity: 0.7 }}>&amp;</span> {name2}
          </>
        ) : (
          coupleNames
        )}
      </h1>
    </div>
  );
}
