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

  const music = readFileSync(join(ROOT, 'src/pages/Music.jsx'), 'utf8');
  const m = music.match(/const REQUEST_STATUSES = \[([^\]]*)\]/);
  if (!m) {
    fail('coverage', 'Music.jsx has no REQUEST_STATUSES list to check');
  } else {
    const offered = m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);

    const unreachable = declared.filter(d => !offered.includes(d));
    if (unreachable.length) {
      fail('coverage', `writable but reachable by no tab: ${unreachable.join(', ')} — ` +
        'a request with this status is counted in the headline and shown nowhere');
    } else {
      pass('coverage', 'every writable status is reachable by a tab');
    }

    // The other direction: a tab for a value nothing can ever write is a dead
    // control that will always read "(0)".
    const phantom = offered.filter(o => !declared.includes(o));
    if (phantom.length) fail('coverage', `tab offered for a status nothing can write: ${phantom.join(', ')}`);
    else pass('coverage', 'no tab offers a status the schema cannot produce');

    // Every tab needs a label, or it renders blank.
    const lm = music.match(/const STATUS_LABELS = \{([^}]*)\}/);
    const labelled = lm ? [...lm[1].matchAll(/(\w+):/g)].map(x => x[1]) : [];
    const unlabelled = offered.filter(o => !labelled.includes(o));
    if (unlabelled.length) fail('coverage', `tab with no label: ${unlabelled.join(', ')}`);
    else pass('coverage', 'every tab has a label');
  }

  // Every status a writer can produce must be one the schema declares.
  const review = readFileSync(join(ROOT, 'api/song-request-review.js'), 'utf8');
  const written = [...review.matchAll(/status: '([a-z_]+)'/g)].map(x => x[1]);
  const undeclared = [...new Set(written)].filter(w => !declared.includes(w));
  if (undeclared.length) fail('writers', `written but not declared in the schema: ${undeclared.join(', ')}`);
  else pass('writers', `every status written by the server is declared: ${[...new Set(written)].join(', ')}`);
}

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the filters cover their domain');
process.exit(failed ? 1 : 0);
