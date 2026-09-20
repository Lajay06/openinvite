/**
 * src/components/guest-website/layouts/sectionMarks.js — ONE MAP FROM LAYOUT TO
 * MARK, AND THE PAGE ANCHOR THAT FOLLOWS FROM IT.
 *
 * GuestPageHeading.jsx and UniverseBlocks.jsx each carried their own copy of
 * this map (MARKS and KICKER_BY_LAYOUT), nineteen entries apiece, which is the
 * shape of drift: a universe added to one and not the other renders its page
 * title with its own mark and its Home kicker with a plain label. One map.
 *
 * THE ANCHOR. Within a page, the kicker, heading, paragraph and quote share
 * one alignment and one left edge, and that anchor is the universe's own
 * SectionMark — left for the marks that set textAlign left or lay out as a
 * flex row, centered for the two that center (Minimal, Paris). The mark is
 * artwork and stays as designed; the body follows it (Batch 2, phase two).
 * Each mark declares `Component.anchor`; the guard
 * (scripts/test-page-anchor-parity.mjs) measures the painted mark and asserts
 * the declaration is true, so this cannot drift from the artwork unnoticed.
 *
 * NO LAYOUT KEY (tulum, or no universe) resolves to MinimalSectionMark for a
 * page title, exactly as GuestPageHeading always has, so its anchor is
 * center. A Home kicker with no layout renders a plain label instead (see
 * UniverseKicker) and inherits its block's alignment, which is the same
 * anchor by construction.
 */
import AmalfiSectionMark from './AmalfiSectionMark';
import AspenSectionMark from './AspenSectionMark';
import BaliSectionMark from './BaliSectionMark';
import BrooklynSectionMark from './BrooklynSectionMark';
import CapeTownSectionMark from './CapeTownSectionMark';
import CapriSectionMark from './CapriSectionMark';
import EdinburghSectionMark from './EdinburghSectionMark';
import FlorenceSectionMark from './FlorenceSectionMark';
import HavanaSectionMark from './HavanaSectionMark';
import KyotoSectionMark from './KyotoSectionMark';
import MonacoSectionMark from './MonacoSectionMark';
import MykonosSectionMark from './MykonosSectionMark';
import ParisSectionMark from './ParisSectionMark';
import SedonaSectionMark from './SedonaSectionMark';
import SeoulSectionMark from './SeoulSectionMark';
import ShanghaiSectionMark from './ShanghaiSectionMark';
import TajSectionMark from './TajSectionMark';
import MinimalSectionMark from './MinimalSectionMark';
import EditorialSectionKicker from './EditorialSectionKicker';

export const SECTION_MARK_BY_LAYOUT = {
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
  // kicker rather than a centered mark — both by their own layout's design.
  'london-minimal': MinimalSectionMark,
  'editorial-masthead': EditorialSectionKicker,
};

/** The mark a page title renders for this universe (Minimal when none). */
export function sectionMarkFor(universeConfig) {
  return SECTION_MARK_BY_LAYOUT[universeConfig?.layout] || MinimalSectionMark;
}

/** 'left' | 'center' — the alignment every text block on the page follows. */
export function pageAnchorFor(universeConfig) {
  return sectionMarkFor(universeConfig).anchor || 'left';
}
