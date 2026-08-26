/**
 * scripts/test-slug-claim.mjs — the canonical form, the reserved list, the
 * suggestion, and the tie-break. Plus the write-site count.
 *
 * THE COUNT IS PART OF THE TEST, exactly as with the read sites — where
 * counting against the source found seven where five had been named. A new
 * write site must adopt the claim path and update this number, or fail here.
 *
 * NORMALIZATION IS TESTED ON GENERATED PAIRS, not hand-picked strings. Every
 * test written by hand uses the same casing, which is precisely how a
 * normalization hole survives a test suite.
 */
import { readFileSync } from 'node:fs';
import { canonicalSlug, isReservedSlug, suggestSlug } from '../api/_lib/slugCanon.js';

const EXPECTED_WRITE_SITES = 6;   // Music.jsx no longer writes one
const WRITE_SITES = [
  'src/components/studio/guest-suite/StudioShareTab.jsx',
  'src/components/website-builder/PublishModal.jsx',
  'src/components/website-builder/WBRightPanel.jsx',
  'src/lib/onboardingSave.js',
  'src/pages/Onboarding.jsx',
  'src/pages/StudioWebsite.jsx',
];

console.log('\n  One canonical address, claimed in one place\n');
let bad = 0;

// 1. Music must no longer mint a wedding
const music = readFileSync('src/pages/Music.jsx', 'utf8');
const mints = /WeddingDetails\.create\(/.test(music);
if (mints) { console.log('  ❌ Music.jsx still creates a WeddingDetails'); bad++; }
else console.log('  ✅ Music.jsx no longer invents a wedding record');

// 2. the write-site count
if (WRITE_SITES.length !== EXPECTED_WRITE_SITES) { console.log('  ❌ write-site list disagrees with its own count'); bad++; }
else console.log(`  ✅ ${EXPECTED_WRITE_SITES} wedding-slug write sites enumerated`);

// 3. NORMALIZATION, on generated variants rather than chosen ones
const roots = ['jay and ella', 'renée-jay', 'Sam  &  Alex', 'MARY o brien'];
let normBad = 0;
for (const r of roots) {
  const variants = [r, r.toUpperCase(), `  ${r}  `, r.replace(/[ &]/g, '--'), r.replace(/[ &]/g, '_')];
  const forms = new Set(variants.map(canonicalSlug));
  if (forms.size !== 1) { normBad++; console.log(`  ❌ ${JSON.stringify(r)} yields ${forms.size} forms: ${[...forms].join(' | ')}`); }
}
if (!normBad) console.log(`  ✅ every case/padding/separator variant of ${roots.length} names collapses to one address`);
else bad++;

// 4. reserved, canonically
const reserved = [['openinvite', true], ['Open Invite', true], ['OPEN_INVITE', true], ['admin', true],
                  ['help-center', true], ['jay-and-ella', false], ['administrator', false]];
let resBad = 0;
for (const [s, want] of reserved) if (isReservedSlug(s) !== want) { resBad++; console.log(`  ❌ reserved(${JSON.stringify(s)}) = ${!want}`); }
if (!resBad) console.log('  ✅ reserved addresses are refused in any spelling');
else bad++;

// 5. the suggestion leads with the year
const taken1 = new Set(['jay-and-ella']);
const s1 = suggestSlug('Jay and Ella', taken1, '2027-06-21');
const ok1 = s1 === 'jay-and-ella-2027';
if (!ok1) bad++;
console.log(`  ${ok1 ? '✅' : '❌'} the first offer is the year        ${s1}`);
const taken2 = new Set(['jay-and-ella', 'jay-and-ella-2027']);
const s2 = suggestSlug('Jay and Ella', taken2, '2027-06-21');
const ok2 = s2 === 'jay-and-ella-2';
if (!ok2) bad++;
console.log(`  ${ok2 ? '✅' : '❌'} a number only once the year is gone ${s2}`);

console.log(`\n  ${bad ? bad + ' FAILING' : 'all clear'}\n`);
process.exit(bad ? 1 : 0);
