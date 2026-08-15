/**
 * scripts/test-single-table-write-path.mjs
 *
 * Static source guard: seating writes may only happen in one file.
 *
 * WHY THIS EXISTS
 * ---------------
 * src/lib/tableAssignment.js has claimed to be the "single write path" in its
 * own header since it was written. It was not true: Seating.jsx wrote
 * Table.assigned_guests and Guest.table_assignment directly from three places,
 * including the click-to-seat interaction that is the primary way a couple
 * seats anyone. The comment asserting the rule is exactly what let the rule rot
 * — nothing checked it.
 *
 * A comment cannot enforce an invariant. This can. Same shape as the
 * vendor-contact and marketing-hero consistency guards already in CI.
 *
 * WHAT IT FORBIDS, and why each matters:
 *   Guest.update(..., { table_assignment })  — the denormalised display cache.
 *     A second writer means the cache and Table.assigned_guests can disagree,
 *     and the cache is what DailyUpdate, the CSV export and Ava read.
 *   Table.update(..., { assigned_guests })   — the actual seating record.
 *     A second writer means the rules that live in the lib (event scoping, the
 *     already-seated refusal, capacity growth) can be bypassed.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOWED = 'src/lib/tableAssignment.js';

const RULES = [
  { label: 'Guest.update writing table_assignment',
    re: /Guest\.update\s*\([^)]*table_assignment/s },
  { label: 'Table.update writing assigned_guests',
    re: /Table\.update\s*\([^)]*assigned_guests/s },
];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(jsx?|mjs)$/.test(e)) out.push(p);
  }
  return out;
}

const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${pass || !detail ? '' : `\n        ${detail}`}`);
};

const files = walk('src');
check(`scanned a non-empty set of source files (${files.length})`, files.length > 50, `${files.length}`);

for (const rule of RULES) {
  const offenders = [];
  for (const f of files) {
    const rel = f.replace(/\\/g, '/');
    if (rel === ALLOWED) continue;
    const src = readFileSync(f, 'utf8');
    // Line-oriented so the report names a line, not just a file.
    src.split('\n').forEach((line, i) => {
      if (rule.re.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
  check(`${rule.label} appears ONLY in ${ALLOWED}`, offenders.length === 0,
    offenders.join('\n        '));
}

// The guard is worthless if the allowed file stopped containing the writes —
// that would mean the pattern no longer matches reality and the scan above is
// vacuously green.
const lib = readFileSync(ALLOWED, 'utf8');
for (const rule of RULES) {
  check(`${ALLOWED} still contains ${rule.label} (guard is not vacuous)`,
    lib.split('\n').some(l => rule.re.test(l)));
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}`);
process.exit(results.every(Boolean) ? 0 : 1);
