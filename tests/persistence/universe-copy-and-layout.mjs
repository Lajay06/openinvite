/**
 * EVERY UNIVERSE DECLARES ITS OWN WORDS, ITS OWN LAYOUT, AND ONE ANCHOR.
 *
 * Batch 2 (owner, 2026-09-17), found by lane A's sweep on 2026-10-17: tulum
 * was the only one of the twenty with no copy block and no layout. With no
 * copy it fell back to the generic "You're invited" in EntranceMoment.jsx;
 * with no layout it missed every branch in WeddingHomePage.jsx and rendered
 * the default masthead. Nothing failed, because a missing key is a fallback,
 * and a fallback renders.
 *
 * So this asserts presence, per universe in the catalog the picker offers:
 *   1. the full copy block, every key a non-empty string;
 *   2. a layout, and that layout has a section mark in the one registry
 *      (layouts/sectionMarks.js) and a branch in WeddingHomePage.jsx and
 *      WeddingOurStoryPage.jsx (or a bespoke page that names it);
 *   3. every mark declares the SAME anchor (Batch 2, layout parity), so no
 *      universe's body can sit left under a centered hero while another's
 *      sits centered. The painted half is scripts/test-page-anchor-parity.mjs.
 *
 * PRE-MORTEM — what would let this pass while the defect exists:
 *   · A key present as '' or whitespace. Guarded: trimmed length.
 *   · A layout string that no page branches on. Guarded: the string must
 *     appear in the registry and in both page files.
 *   · A universe added to UNIVERSE_CONFIGS but not the catalog, or the
 *     reverse. Guarded: the two id sets must match.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { UNIVERSE_CONFIGS } from '../../src/lib/websiteThemes.js';
import { UNIVERSE_CATALOG } from '../../src/lib/universeCatalog.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

export const COPY_KEYS = [
  'heroKicker', 'storyKicker', 'celebrationKicker', 'rsvpKicker',
  'rsvpIntro', 'rsvpWelcome', 'rsvpCta', 'rsvpSent',
];

export async function runUniverseCopyAndLayout() {
  const results = [];
  console.log('\n  Every universe declares its copy block, a layout, and the one page anchor:\n');

  const registry = read('src/components/guest-website/layouts/sectionMarks.js');
  const home = read('src/components/guest-website/pages/WeddingHomePage.jsx');
  const story = read('src/components/guest-website/pages/WeddingOurStoryPage.jsx');
  const markOf = {};
  for (const m of registry.matchAll(/'([a-z-]+)': (\w+),/g)) markOf[m[1]] = m[2];

  const catalogIds = UNIVERSE_CATALOG.map((u) => u.id).sort();
  const configIds = Object.keys(UNIVERSE_CONFIGS).sort();
  results.push(JSON.stringify(catalogIds) === JSON.stringify(configIds)
    ? pass(`the catalog and UNIVERSE_CONFIGS name the same ${catalogIds.length} universes`)
    : fail('the catalog and UNIVERSE_CONFIGS name the same universes', configIds, catalogIds));

  for (const { id } of UNIVERSE_CATALOG) {
    const cfg = UNIVERSE_CONFIGS[id] || {};
    const missing = COPY_KEYS.filter((k) => typeof cfg.copy?.[k] !== 'string' || !cfg.copy[k].trim());
    results.push(missing.length === 0
      ? pass(`${id}: declares all ${COPY_KEYS.length} copy keys`)
      : fail(`${id}: declares all ${COPY_KEYS.length} copy keys`, COPY_KEYS, `missing ${missing.join(', ')}`));

    const layout = cfg.layout;
    const where = [];
    if (!layout) where.push('no layout key');
    else {
      if (!markOf[layout]) where.push('no mark in sectionMarks.js');
      if (!home.includes(`'${layout}'`)) where.push('no branch in WeddingHomePage.jsx');
      if (!story.includes(`'${layout}'`)) where.push('no branch in WeddingOurStoryPage.jsx');
    }
    results.push(where.length === 0
      ? pass(`${id}: layout '${layout}' has a mark and a Home and Our story branch`)
      : fail(`${id}: declares a layout its pages render`, 'layout with mark and branches', where.join('; ')));
  }

  // ONE ANCHOR. Read off each mark file, as the parity guard reads it.
  const anchors = {};
  for (const comp of new Set([...Object.values(markOf), 'MinimalSectionMark'])) {
    const src = read(`src/components/guest-website/layouts/${comp}.jsx`);
    anchors[comp] = (src.match(new RegExp(`${comp}\\.anchor = '(left|center)'`)) || [])[1] || 'none';
  }
  const off = Object.entries(anchors).filter(([, a]) => a !== 'center');
  results.push(off.length === 0
    ? pass(`all ${Object.keys(anchors).length} section marks declare the center anchor`)
    : fail('all section marks declare the center anchor', 'center', off.map(([c, a]) => `${c}=${a}`).join(', ')));

  return results;
}
