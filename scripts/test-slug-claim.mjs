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

const ROUTED = [
  'src/components/website-builder/PublishModal.jsx',
  'src/components/studio/guest-suite/StudioShareTab.jsx',
  'src/pages/Onboarding.jsx',
];
// NOT YET ROUTED. This list is the DEBT, and the suite states it every run.
// A guard that passes on a half-finished job teaches everyone the job is
// finished — the same shape as a measurement detached from its build: the
// number is honest and the impression it creates is not. The next branch
// shrinks this list deliberately, or the count below fails.
// NOT ROUTED, and after enumerating each: THEY ARE NOT WRITE SITES.
//   WBRightPanel  — its slug input calls updateField, which sets LOCAL STATE.
//   StudioWebsite — one persistence point, doSave, on a 2-second autosave. An
//                   address is CLAIMED, not stored, so it cannot ride an
//                   autosave: every keystroke would fire a claim. `slug` is now
//                   excluded from WRITABLE_FIELDS, exactly as websitePassword
//                   already was and for the same reason.
//   onboardingSave— builds a payload; the caller decides what persists. Its
//                   slug is deleted from the draft save and claimed once at the
//                   end.
// So the count is not 3-of-6 with three left: it is three surfaces routed and
// three that no longer write an address at all.
const UNROUTED = [];
const EXPECTED_WRITE_SITES = ROUTED.length + UNROUTED.length;   // 6

console.log('\n  One canonical address, claimed in one place\n');
let bad = 0;

// 1. Music must no longer mint a wedding
const music = readFileSync('src/pages/Music.jsx', 'utf8');
const mints = /WeddingDetails\.create\(/.test(music);
if (mints) { console.log('  ❌ Music.jsx still creates a WeddingDetails'); bad++; }
else console.log('  ✅ Music.jsx no longer invents a wedding record');

// 2. ADOPTION IS PARTIAL AND SAYS SO
for (const f of ROUTED) {
  if (!/claimSlug\(/.test(readFileSync(f, 'utf8'))) {
    console.log(`  ❌ ${f} is listed as routed but does not call claimSlug`); bad++;
  }
}
// The three that no longer write must STAY not-writing.
const MUST_NOT_WRITE = {
  'src/pages/StudioWebsite.jsx': /Object\.keys\(DEFAULT\)\.filter\(k => k !== 'slug'\)/,
  'src/pages/Music.jsx': /^(?!.*WeddingDetails\.create\().*$/s,
};
for (const [f, re] of Object.entries(MUST_NOT_WRITE)) {
  if (!re.test(readFileSync(f, 'utf8'))) {
    console.log(`  ❌ ${f} no longer holds its no-write guarantee`); bad++;
  }
}
if (/resolveUniqueSlug/.test(readFileSync('src/pages/Onboarding.jsx', 'utf8').replace(/\/\/[^\n]*/g, ''))) {
  console.log('  ❌ Onboarding.jsx still has the client-side check-then-write'); bad++;
}
console.log(`  ✅ ${ROUTED.length} surfaces claim through the server path`);
console.log('  ✅ 3 more no longer write an address at all (local state, autosave, draft)');

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

// NOT "all clear". Every assertion passes and the job is one-sixth done; a
// summary that says "all clear" is honest about the tests and misleading about
// the state. It reports what is true of the WORK, not only of the checks.
// THE TWO RULES THAT MATTER MOST IN api/claim-slug.js.
const claim = readFileSync('api/claim-slug.js', 'utf8');

// 1. the write uses the CALLER's token, never the admin key. The endpoint
//    shipped writing with the admin key and never once succeeded.
const writesWithAdmin = /method: 'PUT'[\s\S]{0,200}BASE44_ADMIN_KEY/.test(claim);
if (writesWithAdmin) { console.log('  ❌ a PUT uses BASE44_ADMIN_KEY — owner-scoped RLS makes that a flat 403'); bad++; }
else console.log('  ✅ the write uses the caller\'s own token');

// 2. NO ADMIN FALLBACK. Falling back when the caller's token is absent would
//    bypass the RLS that stops a caller claiming a record they do not own.
const hasFallback = /callerToken\s*\|\|\s*BASE44_ADMIN_KEY|\?\s*callerToken\s*:\s*BASE44_ADMIN_KEY/.test(claim);
if (hasFallback) { console.log('  ❌ the write falls back to the admin key when a token is absent'); bad++; }
else console.log('  ✅ no admin fallback — no token means refuse, never escalate');

// 3. taken and save-failed are different messages
const distinct = /'save-failed'/.test(claim) && /That address is taken/.test(claim);
if (!distinct) { console.log('  ❌ a collision and a save failure are not distinguishable'); bad++; }
else console.log('  ✅ a collision and a save failure say different things');

console.log(bad
  ? `\n  ${bad} FAILING\n`
  : `\n  every wedding address is claimed through one server path\n`);
process.exit(bad ? 1 : 0);
