import React from 'react';

/**
 * The guest page's title, in one of three treatments — a TEMPORARY variant
 * switch built so the owner can choose from real renders rather than from a
 * description.
 *
 * The owner praised our-story: "a beautiful all uppercase heading in sans
 * serif… the sans serif styling application is the best fit". That page shows
 * an all-caps sans kicker and no visible serif title; celebration shows the
 * kicker AND a serif h1 carrying the same words; every other page shows a
 * serif h1 and no kicker. Three readings follow, and they produce visibly
 * different sites, so none of them is guessed here.
 *
 *   A  literal — the title IS the 11px all-caps micro-label, serif h1 removed.
 *   B  additive — keep the serif h1, add the kicker where it is missing.
 *   C  the treatment, at title size — all-caps sans sized as a page title,
 *      serif h1 removed, and no word printed twice.
 *
 * Set at build time: VITE_HEADING_VARIANT=A|B|C. Default is the CURRENT
 * behaviour so nothing changes for anyone until a variant is chosen.
 *
 * DELETE THIS FILE once the owner has picked and the winner is implemented
 * directly. It exists to produce honest frames — the product really renders
 * each one — not to ship a configurable heading system.
 */
export const HEADING_VARIANT = import.meta.env.VITE_HEADING_VARIANT || 'current';

export default function GuestPageTitle({ text, theme, typography, style = {} }) {
  const v = HEADING_VARIANT;

  const serif = {
    fontFamily: typography.headingFont,
    fontWeight: typography.headingWeight,
    fontStyle: typography.headingStyle || 'normal',
    color: theme.lightText,
    ...style,
  };

  const capsSans = (size, spacing) => ({
    fontFamily: typography.bodyFont,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: spacing,
    fontSize: size,
    color: theme.lightText,
    margin: style.marginBottom ? `0 0 ${style.marginBottom}px` : 0,
    textAlign: style.textAlign || 'center',
  });

  // className is load-bearing, not decorative: `.wb-guest-root h1-h6` forces
  // the heading face on every heading with !important, so a sans title on an
  // <h1> needs the mirror class to win on specificity.
  if (v === 'A') return <p className="wb-body-face" style={capsSans(11, '0.32em')}>{text}</p>;
  if (v === 'C') return <h1 className="wb-body-face" style={capsSans('clamp(1.25rem,3.6vw,1.9rem)', '0.18em')}>{text}</h1>;
  // 'B' and 'current' both render the serif title; B's kicker is added by the
  // page, above this, because only the page knows whether it already has one.
  return <h1 style={serif}>{text}</h1>;
}

/** B only: the kicker a page gains when it has none. */
export function GuestPageKicker({ text, theme, typography }) {
  if (HEADING_VARIANT !== 'B') return null;
  return (
    <p style={{
      fontFamily: typography.bodyFont, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.32em', fontSize: 11, color: theme.lightText,
      opacity: 0.7, margin: '0 0 10px', textAlign: 'center',
    }}>{text}</p>
  );
}
