/**
 * Shared type scale and rhythm for the nine homepage sections.
 *
 * The homepage is one argument in nine moves, so the sections have to read as
 * one document rather than nine components that happen to be stacked. These
 * are the only places the scale is defined; a section that wants a different
 * size is either wrong or the scale is.
 */
export const PJS = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

export const INK = '#0A0A0A';
export const PAPER = '#FFFFFF';
export const PRIMARY = '#E03553';

// Light-surface roles come from tokens.js. The dark-surface pair has no token
// yet because nothing outside the marketing pages runs on ink; both are stated
// here once rather than hand-rolled per section.
export const MUTED_ON_LIGHT = 'rgba(10,10,10,0.6)';
export const MUTED_ON_DARK = 'rgba(255,255,255,0.72)';
export const RULE_ON_LIGHT = 'rgba(10,10,10,0.12)';
export const RULE_ON_DARK = 'rgba(255,255,255,0.14)';

// Flush left, per the section 1 build note, and the same gutter everywhere so
// every headline starts on the same vertical line down the whole page.
export const SECTION_PAD = 'clamp(88px, 11vw, 168px) clamp(24px, 6vw, 96px)';
export const MEASURE = 780;          // reading measure for body copy
export const MEASURE_WIDE = 1040;    // headlines can run wider

export const H2 = {
  fontFamily: PJS,
  fontSize: 'clamp(32px, 4.4vw, 60px)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  lineHeight: 1.08,
  margin: 0,
};

export const BODY = {
  fontFamily: PJS,
  fontSize: 'clamp(16px, 1.35vw, 19px)',
  fontWeight: 400,
  lineHeight: 1.65,
  margin: 0,
};
