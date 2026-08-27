#!/usr/bin/env node
/**
 * AN UNPUBLISHED PAGE IS NOT REACHABLE.
 *
 * `enabledPages` was computed in MultiPageWeddingWebsite and then never
 * consulted — `PAGE_COMPONENTS[page]` resolved any slug a guest typed. So every
 * page a couple had turned off was live on a direct URL, and an experience
 * guide with `published: false` rendered in full to anyone with the link.
 * Publishing controlled the nav link and nothing else.
 *
 * ENUMERATED BEFORE FIXING: `experienceGuide.published` is the only flag named
 * "published", but it is not the only gate of this shape. The nav's other
 * inputs — transport.enabledModes, accommodation.manualProperties,
 * music.guestRequestsEnabled, weddingPolicies sections — gate the link and not
 * the page in exactly the same way. They land together.
 *
 * Three cases:
 *   1. GATE       — the page consults availability before rendering
 *   2. SAME INPUTS — the gate uses the nav's own inputs, not a second copy
 *   3. NO NEW STATE — it reuses InvitationNotAvailable rather than inventing one
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);

const src = readFileSync(join(ROOT, 'src/components/guest-website/MultiPageWeddingWebsite.jsx'), 'utf8');

/* ── 1. THE GATE ────────────────────────────────────────────────────── */
const gateIdx = src.indexOf('const pageIsAvailable');
const renderIdx = src.indexOf('const PageComponent =');
if (gateIdx === -1) {
  fail('gate', 'no availability check before the page renders');
} else if (gateIdx > renderIdx) {
  fail('gate', 'availability is computed AFTER the component is resolved');
} else {
  pass('gate', 'availability is decided before the page component is chosen');
}

const refusal = src.slice(gateIdx, renderIdx);
if (/if \(!pageIsAvailable\) return/.test(refusal)) pass('gate', 'an unavailable page returns rather than rendering');
else fail('gate', 'the availability result is computed and not acted on');

/* ── 2. THE SAME INPUTS AS THE NAV ──────────────────────────────────── */
// The nav decides what to LINK to; this decides what to SERVE. If they read
// different fields they will eventually disagree, and a link will lead to a
// refusal — or worse, a refusal will hide a page the nav still advertises.
const navProps = [...src.matchAll(/has([A-Z][a-zA-Z]*)=\{([^}]*)\}/g)].map(m => m[2].trim());
if (navProps.length === 0) {
  fail('same-inputs', 'could not read the nav gates — this guard is not measuring anything');
} else {
  const gateBlock = src.slice(src.indexOf('const subPageAvailability'), renderIdx);
  const FIELDS = ['transport?.enabledModes', 'accommodation?.manualProperties',
                  'music?.guestRequestsEnabled', 'experienceGuide?.published', 'weddingPolicies'];
  const missing = FIELDS.filter(f => {
    const inNav = navProps.some(p => p.includes(f));
    const inGate = gateBlock.includes(f);
    return inNav && !inGate;
  });
  if (missing.length) fail('same-inputs', `the nav gates on ${missing.join(', ')} but the page does not`);
  else pass('same-inputs', `page and nav gate on the same ${FIELDS.length} inputs`);
}

/* ── 3. NO FIFTH EMPTY STATE ────────────────────────────────────────── */
if (/if \(!pageIsAvailable\) return <InvitationNotAvailable \/>;/.test(src)) {
  pass('no-new-state', 'reuses the existing warm unavailable page — indistinguishable from an unpublished site');
} else {
  fail('no-new-state', 'an unavailable page does not render InvitationNotAvailable — do not invent a new empty state');
}

// home must never be gated away: it is the address a guest was given.
if (/page === 'home' \|\|/.test(src)) pass('no-new-state', 'home is always reachable');
else fail('no-new-state', 'home is not exempt — a guest with the couple\'s own address could be refused');

console.log(failed ? `\n  ${failed} failure(s)` : '\n  an unpublished page is not reachable');
process.exit(failed ? 1 : 0);
