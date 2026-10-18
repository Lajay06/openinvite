/**
 * src/components/home/homeStatementHeading.js
 *
 * THE HOME STATEMENT HEADING (owner ruling on #1092, the 2026-10-13 request).
 * One style for "All the powerful tools, beautifully designed..."
 * (ValuePropSection.jsx) and "The whole planner, in your pocket."
 * (AppPhoneSection.jsx), so the two cannot drift apart. The values are the
 * value prop's own, unchanged; 768px is the breakpoint its phone layout uses.
 * It lives here, not in src/index.css, because the dashboard's no-tracking
 * rule reads index.css and this heading is marketing type.
 */
export const HOME_STATEMENT_HEADING = {
  desktop: { fontSize: 'clamp(26px, 4.17vw, 97px)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
  phone: { fontSize: 'clamp(22px, 6vw, 40px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
};

const css = (s) => `font-size: ${s.fontSize}; font-weight: ${s.fontWeight}; line-height: ${s.lineHeight}; letter-spacing: ${s.letterSpacing};`;

/** The same style as CSS, for a section that styles its copy with a class. */
export const homeStatementHeadingCss = (selector) =>
  `${selector} { ${css(HOME_STATEMENT_HEADING.desktop)} }\n@media (max-width: 768px) { ${selector} { ${css(HOME_STATEMENT_HEADING.phone)} } }`;
