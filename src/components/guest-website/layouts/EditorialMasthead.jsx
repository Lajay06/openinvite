/**
 * EditorialMasthead — the "editorial-masthead" per-universe layout's hero
 * treatment: a small Nº/world kicker line, a fine woven-pattern rule, then
 * the couple's names set oversized in the universe's display serif,
 * breaking across two lines with asymmetric (left, not centred) alignment
 * and an italic ampersand accent between them.
 *
 * Deliberately generic — takes theme/typography/copy as props rather than
 * hardcoding Marrakech — so any future universe that opts into
 * `layout: 'editorial-masthead'` (see websiteThemes.js UNIVERSE_CONFIGS)
 * can reuse this exact component with its own palette/type/kicker text.
 * Marrakech is the first universe to author content for it, not the only
 * one architecturally able to.
 */
import React from 'react';
import ZelligeDivider from './ZelligeDivider';

function splitCoupleNames(coupleNames) {
  const parts = (coupleNames || '').split(/\s*&\s*|\s+and\s+/i).filter(Boolean);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(' & ')];
  return [coupleNames || '', ''];
}

export default function EditorialMasthead({ coupleNames, kicker, theme, typography, textColor }) {
  const [name1, name2] = splitCoupleNames(coupleNames);
  const color = textColor || theme.lightText;

  return (
    <div style={{ textAlign: 'left', width: '100%', maxWidth: 880 }}>
      {kicker && (
        <p
          style={{
            fontFamily: typography.bodyFont,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color,
            opacity: 0.7,
            margin: 0,
          }}
        >
          {kicker}
        </p>
      )}

      <ZelligeDivider
        color={color}
        opacity={0.4}
        height={14}
        style={{ width: 72, margin: '18px 0 28px', backgroundPosition: 'left center' }}
      />

      <h1
        style={{
          fontFamily: typography.headingFont,
          fontWeight: typography.headingWeight,
          fontSize: 'clamp(2.75rem, 9vw, 6.5rem)',
          lineHeight: 0.98,
          letterSpacing: '-0.01em',
          color,
          margin: 0,
        }}
      >
        <span style={{ display: 'block' }}>{name1}</span>
        <span
          style={{
            display: 'block',
            marginLeft: 'clamp(1rem, 8vw, 4rem)',
            marginTop: '0.08em',
          }}
        >
          <span style={{ fontStyle: 'italic', opacity: 0.7, marginRight: '0.28em' }}>&amp;</span>
          {name2}
        </span>
      </h1>
    </div>
  );
}
