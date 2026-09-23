#!/usr/bin/env node
/**
 * A SET OF FILTERS MUST COVER ITS OWN DOMAIN.
 *
 * SongRequest.status declares four values. The Music page offered three tabs.
 * A request marked 'added' — written by api/song-request-review.js when the
 * couple puts it on the playlist — was counted in the headline and displayed
 * under no tab at all.
 *
 * MEASURED IN PRODUCTION before the fix: 235 requests — approved 231,
 * declined 3, added 1. Exactly one row was unreachable by any tab, which is
 * precisely what the owner reported.
 *
 * THIS GUARD READS THE SCHEMA, not a copy of it. A future enum value is caught
 * the moment it is declared, rather than the moment a couple notices a request
 * that exists and cannot be seen.
 *
 * The general shape, worth applying elsewhere: anything a writer can produce
 * must be reachable by a reader.
 *
 * ── THE SHAPE CHANGED; THE PROPERTY DID NOT ────────────────────────────────
 *
 * Round two, item 12 rebuilt this page as a table, and the four status tabs
 * went with the hand-rolled request list. That does NOT weaken the property —
 * it satisfies it differently, and this guard now checks it where it lives:
 *
 *   BEFORE  one tab per status; a status with no tab was invisible.
 *   NOW     every request is a ROW, under All and under Guest requests, and
 *           its status is printed in the From column. A status is unreachable
 *           only if it has no label to print.
 *
 * So the checks are: every declared status has a label; the table renders that
 * label; the request filter is not itself a status filter that could hide one;
 * and the table opens on All, so nothing is behind a tab that can be empty
 * while requests exist. The failure this was written about — 235 requests with
 * one of them displayable nowhere — is still caught, because a new enum value
 * with no entry in STATUS_LABEL fails the first check.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);

// jsonc — strip comments before parsing
const raw = readFileSync(join(ROOT, 'base44/entities/SongRequest.jsonc'), 'utf8')
  .replace(/^\s*\/\/.*$/gm, '');
const schema = JSON.parse(raw);
const declared = schema.properties?.status?.enum;

if (!Array.isArray(declared) || declared.length === 0) {
  fail('schema', 'SongRequest.status declares no enum — this guard cannot check coverage');
} else {
  pass('schema', `SongRequest.status declares: ${declared.join(', ')}`);

  const rows = readFileSync(join(ROOT, 'src/lib/musicRows.js'), 'utf8');
  const table = readFileSync(join(ROOT, 'src/components/music/MusicTable.jsx'), 'utf8');

  // EVERY STATUS HAS A LABEL. A row whose status prints as nothing is the same
  // defect as a status with no tab: the request exists and says nothing about
  // where it stands.
  const lm = rows.match(/export const STATUS_LABEL = \{([\s\S]*?)\};/);
  const labelled = lm ? [...lm[1].matchAll(/(\w+):/g)].map((x) => x[1]) : [];
  const unlabelled = declared.filter((d) => !labelled.includes(d));
  if (!lm) {
    fail('coverage', 'musicRows.js has no STATUS_LABEL map to check');
  } else if (unlabelled.length) {
    fail('coverage', `status with no label: ${unlabelled.join(', ')} — ` +
      'the row would print nothing where its status belongs');
  } else {
    pass('coverage', `every declared status has a label: ${declared.join(', ')}`);
  }

  // The other direction: a label for a value nothing can ever write is a
  // string that will never appear.
  const phantom = labelled.filter((o) => !declared.includes(o));
  if (phantom.length) fail('coverage', `label for a status nothing can write: ${phantom.join(', ')}`);
  else pass('coverage', 'no label for a status the schema cannot produce');

  // THE LABEL IS ACTUALLY RENDERED. A map nothing reads is not coverage.
  if (/STATUS_LABEL\[r\.status\]/.test(table)) pass('coverage', 'the table prints the status on the row');
  else fail('coverage', 'the table does not print STATUS_LABEL — a status map nothing renders is not coverage');

  // NO FILTER PARTITIONS BY STATUS, so none of them can hide one. The filters
  // are All, waiting, the couple's tracks and the guests' requests; every
  // request appears under two of the four whatever its status.
  const fm = table.match(/const FILTERS = \[([\s\S]*?)\];/);
  const vals = fm ? [...fm[1].matchAll(/val: '([a-z]+)'/g)].map((x) => x[1]) : [];
  const statusFilter = vals.filter((v) => declared.includes(v));
  if (!fm) fail('coverage', 'MusicTable has no FILTERS list to check');
  else if (statusFilter.length) {
    fail('coverage', `a filter partitions by status (${statusFilter.join(', ')}) — ` +
      'every status needs its own then, or one of them is hidden again');
  } else {
    pass('coverage', `the filters are views, not statuses: ${vals.join(', ')}`);
  }

  // Every status a writer can produce must be one the schema declares.
  const review = readFileSync(join(ROOT, 'api/song-request-review.js'), 'utf8');
  const written = [...review.matchAll(/status: '([a-z_]+)'/g)].map(x => x[1]);
  const undeclared = [...new Set(written)].filter(w => !declared.includes(w));
  if (undeclared.length) fail('writers', `written but not declared in the schema: ${undeclared.join(', ')}`);
  else pass('writers', `every status written by the server is declared: ${[...new Set(written)].join(', ')}`);
}

/* ── THE DEFAULT VIEW ───────────────────────────────────────────────── */
// A DEFAULT VIEW SHOULD NOT DEPEND ON DATA THAT CAN CHANGE UNDER IT.
// The page opened on Pending, which is empty in production while 235 requests
// exist. "First non-empty tab" was the tempting fix and is the wrong one — a
// tab that moves when the underlying set empties teaches a couple that the
// product rearranges itself.
const table2 = readFileSync(join(ROOT, 'src/components/music/MusicTable.jsx'), 'utf8');
const initial = table2.match(/const \[filter, setFilter\] = useState\('([a-z]+)'\)/);
if (!initial) {
  fail('default', 'could not read the default filter');
} else if (initial[1] === 'all') {
  pass('default', 'the table opens on All, with every count visible');
} else {
  fail('default', `the table opens on '${initial[1]}' — a view that can be empty while requests exist`);
}

// A REQUEST NOBODY HAS ANSWERED IS STILL SURFACED, without being the default
// view. It sorts to the top of the table instead, so it is the first thing
// read without the page hiding everything else behind a tab.
const rows2 = readFileSync(join(ROOT, 'src/lib/musicRows.js'), 'utf8');
if (/if \(r\.kind === 'request' && r\.status === 'pending'\) return -1;/.test(rows2)) {
  pass('default', 'a pending request sorts above everything else');
} else {
  fail('default', 'nothing lifts a pending request — it would sit wherever its title falls');
}

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the filters cover their domain');
process.exit(failed ? 1 : 0);
