#!/usr/bin/env node
/**
 * EACH PAGE APPEARS ONCE IN A GUEST'S NAVIGATION.
 *
 * WeddingWebsiteNav assembles its links from two independent lists and nothing
 * reconciled them:
 *
 *   pageLinks — the couple's enabledPages, via WEDDING_PAGES
 *   subLinks  — hasTransport / hasAccommodation / hasMusic / hasExperience
 *
 * Four labels appear in BOTH, identically. A couple who enabled those pages saw
 * each of them twice in their own guests' navigation. Owner-confirmed on the
 * guide; the enumeration found the other three.
 *
 * Two cases:
 *   1. SOURCE   — the two lists still overlap, so the dedupe must stay
 *   2. DEDUPE   — the assembled nav yields each label once
 *
 * Case 1 matters because the honest fix would be to make the lists disjoint —
 * and until someone does, removing the dedupe silently restores the defect.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);

const nav = readFileSync(join(ROOT, 'src/components/guest-website/WeddingWebsiteNav.jsx'), 'utf8');
const themes = readFileSync(join(ROOT, 'src/lib/websiteThemes.js'), 'utf8');

/* ── 1. THE TWO LISTS STILL OVERLAP ─────────────────────────────────── */
const subLabels = [...nav.matchAll(/key: '[a-z-]+', label: '([^']+)'/g)].map(m => m[1].toLowerCase());
const pageLabels = [...themes.matchAll(/\{ slug: '[a-z-]+', label: '([^']+)'/g)].map(m => m[1].toLowerCase());

if (subLabels.length === 0 || pageLabels.length === 0) {
  fail('source', 'could not read one of the two link lists — this guard is not measuring anything');
} else {
  const overlap = subLabels.filter(l => pageLabels.includes(l));
  pass('source', `subLinks: ${subLabels.length}, WEDDING_PAGES: ${pageLabels.length}`);
  if (overlap.length) {
    pass('source', `the lists still overlap on: ${overlap.join(', ')} — the dedupe is load-bearing`);
  } else {
    pass('source', 'the lists are now disjoint — the dedupe is belt and braces');
  }
}

/* ── 2. THE ASSEMBLY DEDUPES ────────────────────────────────────────── */
// Read the real assembly rather than re-implementing it: a test that models the
// code cannot catch the code diverging from the model.
const assembly = nav.slice(nav.indexOf('const rest ='), nav.indexOf('const allLinks'));
if (/seen\.has\(label\)|seen\.add\(label\)/.test(assembly) && /\.filter\(/.test(assembly)) {
  pass('dedupe', 'the nav filters duplicate labels when assembling its links');
} else {
  fail('dedupe', 'the assembled nav does not dedupe — each overlapping page renders twice');
}

if (/\.toLowerCase\(\)/.test(assembly)) pass('dedupe', 'comparison is case-insensitive');
else fail('dedupe', 'labels compared case-sensitively — "Stay" and "stay" would both render');

// The key was the tempting choice and the wrong one.
if (/label/.test(assembly) && !/seen\.has\(l\.key\)/.test(assembly)) {
  pass('dedupe', 'dedupes on the label a guest reads, not the key — subLinks\' "accommodation" ' +
    'and WEDDING_PAGES\' "stay" are different keys under the same word');
} else {
  fail('dedupe', 'dedupes on the key, which leaves accommodation/stay showing as two places to go');
}

console.log(failed ? `\n  ${failed} failure(s)` : '\n  each page appears once');
process.exit(failed ? 1 : 0);
