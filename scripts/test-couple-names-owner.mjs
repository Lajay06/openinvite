#!/usr/bin/env node
/**
 * THE COUPLE'S NAMES HAVE ONE OWNER.
 *
 * Three cases, each failing with its own message — a guard that reports
 * "names are wrong" tells you nothing about which of these broke.
 *
 *   1. BEHAVIOUR   — coupleDisplayName resolves the precedence correctly
 *   2. NO RAW READS — nothing reads a wedding record's `.coupleNames` directly
 *   3. NO SECOND WRITER — nothing writes `coupleNames` except onboardingSave
 *
 * Case 3 is the one that caused the original defect: WBRightPanel had a
 * "Couple names" input writing the DERIVED copy while EventDetails wrote the
 * partner fields, so the two disagreed by design.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { coupleDisplayName, coupleNameParts } from '../api/_lib/coupleNames.js';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);

/* ── 1. BEHAVIOUR ───────────────────────────────────────────────────── */
const cases = [
  [{ couple1Name: 'Jay', couple2Name: 'Ella', coupleNames: 'OLD & STALE' }, 'Jay & Ella',
   'the truth beats the stale copy'],
  [{ coupleNames: 'Jay & Ella' }, 'Jay & Ella', 'a legacy record still resolves'],
  [{ couple1Name: 'Jay', couple2Name: '', coupleNames: 'Jay & Ella' }, 'Jay',
   'a cleared second name means one name'],
  [{ couple1Name: '  Jay  ', couple2Name: ' Ella ' }, 'Jay & Ella', 'whitespace is trimmed'],
  [{ polls: [] }, '', 'a { polls } wedding names nobody'],
  [null, '', 'a null record does not throw'],
];
for (const [input, expected, why] of cases) {
  const got = coupleDisplayName(input);
  if (got === expected) pass('behaviour', why);
  else fail('behaviour', `${why}: got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
}
const parts = coupleNameParts({ coupleNames: 'Jay & Ella' });
if (parts[0] === 'Jay' && parts[1] === 'Ella') pass('behaviour', 'legacy split still yields two names');
else fail('behaviour', `legacy split gave ${JSON.stringify(parts)}`);

/* ── walk src/ and api/ ─────────────────────────────────────────────── */
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx|mjs)$/.test(p)) files.push(p);
  }
})(join(ROOT, 'src'));
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx|mjs)$/.test(p)) files.push(p);
  }
})(join(ROOT, 'api'));

const OWNER = ['api/_lib/coupleNames.js', 'src/lib/coupleNames.js'];
// `verified.coupleNames` is onboardingSave checking its OWN write landed —
// it must read the raw field, that is the point of a write-verification.
const READ_OK = /verified\.coupleNames/;
const RAW_READ = /\b(weddingDetails|details|wd|wedding|record)\??\.coupleNames\b/;

/* ── 2. NO RAW READS ────────────────────────────────────────────────── */
let rawReads = 0;
for (const f of files) {
  const r = relative(ROOT, f);
  if (OWNER.includes(r)) continue;
  for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
    if (READ_OK.test(line)) continue;
    if (RAW_READ.test(line)) { fail('no-raw-reads', `${r}:${i + 1} reads the field directly — call coupleDisplayName()`); rawReads++; }
  }
}
if (!rawReads) pass('no-raw-reads', 'every surface goes through the owner');

/* ── 3. NO SECOND WRITER ────────────────────────────────────────────── */
const WRITE_OK = new Set(['src/lib/onboardingSave.js']);
let writers = 0;
for (const f of files) {
  const r = relative(ROOT, f);
  if (OWNER.includes(r) || WRITE_OK.has(r)) continue;
  for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
    // onChange('coupleNames', …) or { coupleNames: … } inside an update/create payload
    if (/onChange\(\s*['"]coupleNames['"]/.test(line) || /updateField\(\s*['"]coupleNames['"]/.test(line)) {
      fail('no-second-writer', `${r}:${i + 1} writes the derived copy — write couple1Name/couple2Name instead`);
      writers++;
    }
  }
}
if (!writers) pass('no-second-writer', 'only onboardingSave writes the legacy copy');

console.log(failed ? `\n  ${failed} failure(s)` : '\n  couple names: one owner, one writer');
process.exit(failed ? 1 : 0);
