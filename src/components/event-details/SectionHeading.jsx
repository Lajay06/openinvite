import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * The one section heading for the details surfaces.
 *
 * Event details previously carried three different heading treatments on the
 * same page: 13px/600 CENTRED on the Details tab, 11px/700 tracked and left
 * on the Events tab, and DetailsSection's 14px/700 with an icon on the pages
 * built from it. The centred one was the visible complaint — headings
 * centred over left-aligned fields give the eye no left edge to follow — but
 * the three-way split is what made the page feel unplanned.
 *
 * Left aligned, always. Every heading, label, input and divider on these
 * pages now starts at the same x.
 *
 * Deliberately NOT a bounded panel. The instinct was that onboarding "feels
 * better because of containment", but onboarding has no such thing: 13 of
 * its 16 step components have no panel-like container at all, and the 3 that
 * do use them for specific elements (selection cards, list rows, a scrolling
 * box), never to group form sections. What makes onboarding read cleanly is
 * a narrow single-column measure and one decision at a time. The dashboard
 * is a reference surface so it cannot have the pacing, but it can have the
 * measure — hence CONTENT_WIDTH below, and rhythm rather than boxes.
 */
export default function SectionHeading({ children, icon: Icon, style }) {
  return (
    <p style={{
      display: 'flex', alignItems: 'center', gap: 8,
      fontSize: 13, fontWeight: 700, color: '#0A0A0A',
      fontFamily: PJS, margin: '0 0 14px', textAlign: 'left',
      ...style,
    }}>
      {Icon && <Icon size={15} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />}
      {children}
    </p>
  );
}

/**
 * One measure for every details tab and page.
 *
 * Was three: 640 on Details and Theme, 680 on Events, 760 on Ceremony
 * details — so the left edge physically moved when the couple switched tabs,
 * which is the bigger half of the "no consistent left edge" complaint.
 *
 * 640 because it is already the majority value and because the complaint is
 * emptiness: a narrower measure is the lever that fights that, not a wider
 * one. Both of the outliers move inward.
 */
export const CONTENT_WIDTH = 640;

/**
 * Section separator. Asymmetric on purpose, and the numbers came out of
 * measuring rather than guessing.
 *
 * The margin above only has to top up what the preceding field already
 * contributes: a field carries FIELD_GAP (16) beneath it, so 16 more makes
 * 32 of optical space above the rule, and 32 below balances it. Total
 * between-section separation is 65px against 16px within — a 4:1 ratio.
 *
 * The first attempt used a symmetric 36px, which measured 52px above the
 * rule and 36 below: visually off-balance, and 89px total. That is MORE
 * emptiness than the 77px it replaced, which fails the actual complaint —
 * the goal was to make grouping legible without adding air, not to widen
 * the gaps and call it rhythm.
 */
export const sectionDivider = {
  height: 1,
  background: 'rgba(10,10,10,0.08)',
  margin: '16px 0 32px',
};

/**
 * Gap between fields inside one section. Tightened from 20 so that
 * within-section spacing (16) is clearly less than between-section spacing
 * (36 + the divider). Proximity then does the grouping that emptiness was
 * being asked to do, with no new chrome and nothing to add to DESIGN_SPEC.
 */
export const FIELD_GAP = 16;
