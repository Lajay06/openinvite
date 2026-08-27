#!/usr/bin/env node
/**
 * THE ADDRESS IS DERIVED, NOT TYPED.
 *
 * Four cases, each with its own failure message:
 *   1. LADDER   — collisions climb real facts, never a random token
 *   2. DATE     — the date is read without a timezone
 *   3. NO EDITOR — no surface renders an input bound to the address
 *   4. DOCS     — the help copy does not describe a control that is gone
 *
 * Case 3 exists because the editor was found on THREE surfaces when both
 * working lists said two, and the third — PublishModal — was the one a couple
 * was most likely to meet.
 *
 * Case 4 exists because documentation is a surface. Help copy describing a
 * removed control outlives the code it describes, and an enumeration of "code
 * that touches the address" misses it every time.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deriveSlug, slugRootFromNames, weddingDateParts, canonicalSlug } from '../api/_lib/slugCanon.js';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);
const W = (a, b, d) => ({ couple1Name: a, couple2Name: b, weddingDate: d });

/* ── 1. THE LADDER ──────────────────────────────────────────────────── */
const taken = new Set();
const rungs = [];
for (let i = 0; i < 5; i++) {
  const w = W('Jay', 'Ella', '2027-06-14');
  const s = deriveSlug(slugRootFromNames(w), taken, w.weddingDate);
  taken.add(s); rungs.push(s);
}
const EXPECTED = ['jay-and-ella', 'jay-and-ella-2027', 'jay-and-ella-june-2027',
                  'jay-and-ella-14-june-2027', 'jay-and-ella-14-june-2027-2'];
for (let i = 0; i < EXPECTED.length; i++) {
  if (rungs[i] === EXPECTED[i]) pass('ladder', `rung ${i + 1}: ${rungs[i]}`);
  else fail('ladder', `rung ${i + 1}: got ${rungs[i]}, expected ${EXPECTED[i]}`);
}
// The rule the ladder exists to honour.
if (rungs.every(r => !/[a-z]{4}\d{4}/.test(r))) pass('ladder', 'no random-looking token in any rung');
else fail('ladder', `a rung looks like a random token: ${rungs.join(', ')}`);

const checks = [
  [slugRootFromNames(W('O’Brien', 'Zoë', null)), 'o-brien-and-zoe', 'apostrophes and accents normalise'],
  [slugRootFromNames(W('Jay', '', null)), 'jay', 'one name is not a dangling join'],
  [slugRootFromNames({ coupleNames: 'Jay & Ella' }), 'jay-and-ella', 'a legacy record still derives'],
  [slugRootFromNames({ polls: [] }), '', 'no names means no address'],
  [deriveSlug('jay-and-ella', new Set(['jay-and-ella']), null), 'jay-and-ella-2',
   'a dateless record on a clash takes the number rather than being blocked'],
];
for (const [got, want, why] of checks) {
  if (got === want) pass('ladder', why);
  else fail('ladder', `${why}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

/* ── 2. THE DATE, WITHOUT A TIMEZONE ────────────────────────────────── */
// new Date('2027-01-01').getFullYear() is 2026 anywhere west of Greenwich —
// which is the entire US, the market this product sells to in USD. Under a
// derived address that is frozen on a printed card, not a declinable suggestion.
const before = process.env.TZ;
for (const tz of ['Pacific/Midway', 'America/Los_Angeles', 'UTC', 'Australia/Sydney', 'Pacific/Auckland']) {
  process.env.TZ = tz;
  const p = weddingDateParts('2027-01-01');
  const ok = p && p.year === 2027 && p.month === 1 && p.day === 1 && p.monthName === 'january';
  if (ok) pass('date', `${tz}: 2027-01-01 reads as 1 january 2027`);
  else fail('date', `${tz}: 2027-01-01 read as ${p && `${p.day} ${p.monthName} ${p.year}`}`);
}
process.env.TZ = before;
for (const [input, why] of [[null, 'null'], ['', 'empty'], ['not-a-date', 'garbage'], ['2027-13-01', 'month 13']]) {
  if (weddingDateParts(input) === null) pass('date', `${why} yields no rungs rather than throwing`);
  else fail('date', `${why} should have yielded null`);
}
if (canonicalSlug('Jay & Ella') === 'jay-ella') pass('date', 'canonicalSlug still collapses & — which is why the root joins with the word "and"');
else fail('date', 'canonicalSlug behaviour changed unexpectedly');

/* ── walk src/ ──────────────────────────────────────────────────────── */
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(p)) files.push(p);
  }
})(join(ROOT, 'src'));

/* ── 3. NO EDITOR ───────────────────────────────────────────────────── */
let editors = 0;
const EDITOR = /(value=\{[^}]*slug[^}]*\}[^>]*onChange|onChange=\{[^}]*setSlug|setSlugInput|setSlugDraft|claimSlug\()/i;
for (const f of files) {
  const r = relative(ROOT, f);
  for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
    if (EDITOR.test(line)) { fail('no-editor', `${r}:${i + 1} looks like an address editor — the address is derived, nobody types it`); editors++; }
  }
}
if (!editors) pass('no-editor', 'no surface lets a couple type their address');

/* ── 4. DOCUMENTATION IS A SURFACE ──────────────────────────────────── */
const help = readFileSync(join(ROOT, 'src/pages/Help.jsx'), 'utf8');
const STALE = [
  [/edit the slug field/i, 'tells couples to edit a field that no longer exists'],
  [/\[your-slug\]/i, 'uses a placeholder from the removed editor'],
  [/to customi[sz]e it/i, 'offers customisation that is gone'],
];
let stale = 0;
for (const [re, why] of STALE) {
  if (re.test(help)) { fail('docs', `Help.jsx ${why}`); stale++; }
}
if (!stale) pass('docs', 'help copy describes the feature that exists');

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the address derives, and nothing offers to edit it');
process.exit(failed ? 1 : 0);
