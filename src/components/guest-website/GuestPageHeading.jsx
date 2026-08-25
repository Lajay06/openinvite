import React from 'react';
import AmalfiSectionMark from './layouts/AmalfiSectionMark';
import AspenSectionMark from './layouts/AspenSectionMark';
import BaliSectionMark from './layouts/BaliSectionMark';
import BrooklynSectionMark from './layouts/BrooklynSectionMark';
import CapeTownSectionMark from './layouts/CapeTownSectionMark';
import CapriSectionMark from './layouts/CapriSectionMark';
import EdinburghSectionMark from './layouts/EdinburghSectionMark';
import FlorenceSectionMark from './layouts/FlorenceSectionMark';
import HavanaSectionMark from './layouts/HavanaSectionMark';
import KyotoSectionMark from './layouts/KyotoSectionMark';
import MonacoSectionMark from './layouts/MonacoSectionMark';
import MykonosSectionMark from './layouts/MykonosSectionMark';
import ParisSectionMark from './layouts/ParisSectionMark';
import SedonaSectionMark from './layouts/SedonaSectionMark';
import SeoulSectionMark from './layouts/SeoulSectionMark';
import ShanghaiSectionMark from './layouts/ShanghaiSectionMark';
import TajSectionMark from './layouts/TajSectionMark';
import MinimalSectionMark from './layouts/MinimalSectionMark';
import EditorialSectionKicker from './layouts/EditorialSectionKicker';

/**
 * GuestPageHeading — one heading treatment for every guest page.
 *
 * OWNER RULING: "our story has a beautiful all uppercase heading in sans
 * serif… keep it consistent between all pages." That page renders its title
 * through its universe's SectionMark — an all-caps, wide-tracked kicker in the
 * BODY face with a hairline rule beneath — and shows no serif display title at
 * all. Every inner page now does the same, with its own name as the kicker.
 *
 * Consistent does not mean identical across universes: each universe keeps its
 * OWN mark (kyoto's is not london's), so the treatment is shared while the
 * character stays per-universe. That is the same reasoning the story page
 * already used — "SectionMark carries the visual distinctness, not a bespoke
 * DOM shape."
 *
 * WHAT THIS COSTS, audited before building rather than discovered after: the
 * display face leaves inner-page titles. Eleven of fifteen pages still carry
 * it through CARD TITLES — the <p>s converted to real headings in #552, which
 * is what makes this ruling survivable at all. FAQ and music are converted in
 * the same pass for the same reason. Photos ends up sans-only because it has
 * no words on it; that is deliberate, not an oversight.
 */
const MARKS = {
  'amalfi-citrus': AmalfiSectionMark,
  'aspen-lodge': AspenSectionMark,
  'bali-organic': BaliSectionMark,
  'brooklyn-offgrid': BrooklynSectionMark,
  'capetown-estate': CapeTownSectionMark,
  'capri-citrus': CapriSectionMark,
  'edinburgh-estate': EdinburghSectionMark,
  'florence-editorial': FlorenceSectionMark,
  'havana-deco': HavanaSectionMark,
  'kyoto-vertical': KyotoSectionMark,
  'monaco-marina': MonacoSectionMark,
  'mykonos-whitewash': MykonosSectionMark,
  'paris-couture': ParisSectionMark,
  'sedona-mesa': SedonaSectionMark,
  'seoul-glass': SeoulSectionMark,
  'shanghai-glamour': ShanghaiSectionMark,
  'taj-pavilion': TajSectionMark,
  // london's mark is the shared minimal one; marrakech uses the editorial
  // kicker rather than a centred mark — both by their own layout's design.
  'london-minimal': MinimalSectionMark,
  'editorial-masthead': EditorialSectionKicker,
};

// The mark renders as an h1 here. Reading A makes the kicker the page's only
// title, so the kicker must BE the heading — replacing an <h1> with a styled
// <p> would have left every guest page with no document heading at all.
// SectionMarks still default to <p> for their in-page section openers.
export default function GuestPageHeading({ title, theme, typography, universeConfig, textColor }) {
  const Mark = MARKS[universeConfig?.layout] || MinimalSectionMark;
  return (
    <Mark
      as="h1"
      kicker={title}
      theme={theme}
      typography={typography}
      accentColor={theme?.accent}
      textColor={textColor}
    />
  );
}
