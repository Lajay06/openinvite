/**
 * Every typography pairing must resolve to two real faces.
 *
 * A pairing carries the same faces under two names — fontDisplay/fontBody and
 * headingFont/bodyFont. resolveTypography() reads the second pair. A pairing
 * added with only the first would resolve to `undefined` and silently inherit
 * the product face, which looks like a design choice rather than a bug.
 *
 * All 15 currently define both, so this asserts an invariant that is TRUE
 * TODAY and cheap to keep true. The control below proves it can fail.
 */
import { TYPOGRAPHY_PAIRINGS } from '../src/lib/websiteThemes.js';

const CONTROL = process.argv.includes('--control');

// The SAME expression resolveTypography() uses for its fallback branch. Tested
// directly rather than through resolveTypography, because that function looks
// the pairing up in the real array by id — an injected control never reaches
// its fallback branch at all, so a control routed through it passes vacuously.
// (It did, on the first attempt: the faceless pairing was never consulted.)
const facesOf = (p) => ({
  headingFont: p.headingFont || p.fontDisplay,
  bodyFont: p.bodyFont || p.fontBody,
});

const pairings = CONTROL
  ? [...TYPOGRAPHY_PAIRINGS, { id: 'control-faceless', name: 'Control' }]
  : TYPOGRAPHY_PAIRINGS;

console.log(`\n  ${pairings.length} typography pairings must resolve to two real faces\n`);
let bad = 0;
for (const p of pairings) {
  const t = facesOf(p);
  const ok = typeof t.headingFont === 'string' && t.headingFont.trim()
          && typeof t.bodyFont === 'string' && t.bodyFont.trim();
  if (!ok) { console.log(`  \u274c ${p.id}: headingFont=${t.headingFont} bodyFont=${t.bodyFont}`); bad++; }
}
console.log(`\n  ${pairings.length - bad}/${pairings.length} resolve, ${bad} without a face\n`);
if (CONTROL) {
  if (bad > 0) { console.log('  CONTROL PASSED \u2014 a pairing with no faces is caught.\n'); process.exit(0); }
  console.log('  CONTROL FAILED \u2014 a faceless pairing was not caught.\n'); process.exit(1);
}
process.exit(bad ? 1 : 0);
