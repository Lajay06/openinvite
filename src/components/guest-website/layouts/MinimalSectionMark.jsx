/**
 * MinimalSectionMark — the "london-minimal" layout's section opener: a tiny
 * wide-tracked centred kicker + a single hairline rule. The centred,
 * symmetric, hairline-only counterpart to EditorialSectionKicker (which is
 * left-aligned and uses the woven ZelligeDivider) — shared by every page
 * component that opts into `layout: 'london-minimal'`.
 */
import React from 'react';
import HairlineRule from './HairlineRule';

export default function MinimalSectionMark({ kicker, theme, typography, textColor }) {
  const color = textColor || theme.lightText;
  return (
    <div style={{ textAlign: 'center', marginBottom: 56 }}>
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
            margin: '0 0 20px',
          }}
        >
          {kicker}
        </p>
      )}
      <HairlineRule color={color} opacity={0.22} width={40} style={{ margin: '0 auto' }} />
    </div>
  );
}
