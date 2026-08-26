/**
 * scripts/test-slug-resolver.mjs
 *
 * ONE SLUG, ONE WEDDING — OR NOTHING.
 *
 * Seven endpoints resolved a slug with `list.find(...)`: first match wins, on a
 * list whose order nobody controls. Production holds two records on
 * "tulum-test", two on "" and one null, so a guest's contact details, RSVP
 * request, song request, poll vote, poll comment and poll results could each
 * land on a DIFFERENT couple's record than their invitation page did.
 *
 * THE COUNT IS PART OF THE TEST. Seven sites were found by shape, not by name —
 * two more than the five that had been named from memory. If an eighth appears,
 * this fails rather than quietly covering seven of eight.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolveWeddingBySlug } from '../api/_lib/resolveWeddingBySlug.js';

const EXPECTED_SITES = 7;
const files = readdirSync('api').filter(f => f.endsWith('.js'));
const raw = files.filter(f => /\.find\(w => w\.slug ===/.test(readFileSync(`api/${f}`, 'utf8')));
const adopted = files.filter(f => /resolveWeddingBySlug\(/.test(readFileSync(`api/${f}`, 'utf8')));

console.log('\n  One slug, one wedding — or nothing\n');
let bad = 0;

if (raw.length) {
  console.log(`  ❌ ${raw.length} endpoint(s) still resolve a slug with .find: ${raw.join(', ')}`);
  bad++;
} else console.log('  ✅ no endpoint resolves a slug with .find');

if (adopted.length !== EXPECTED_SITES) {
  console.log(`  ❌ ${adopted.length} adoption sites, expected ${EXPECTED_SITES}: ${adopted.join(', ')}`);
  console.log('     A new resolution site must adopt the resolver and update this count.');
  bad++;
} else console.log(`  ✅ all ${EXPECTED_SITES} resolution sites use the shared resolver`);

// The production shape, exactly: two on tulum-test, two on '', one null.
const PROD = [
  { id: '6a537256a029951304f83e18', slug: 'tulum-test' },
  { id: '6b1f0000000000000000beef', slug: 'tulum-test' },
  { id: '6c2f0000000000000000cafe', slug: '' },
  { id: '6d3f0000000000000000face', slug: '' },
  { id: '6e4f0000000000000000dead', slug: null },
  { id: '6f5f0000000000000000feed', slug: 'ada-and-alan' },
];
const CASES = [
  ['two records share the slug', 'tulum-test', 'ambiguous'],
  ['empty string',               '',           'invalid'],
  ['whitespace only',            '   ',        'invalid'],
  ['null',                       null,         'invalid'],
  ['undefined',                  undefined,    'invalid'],
  ['a number',                   42,           'invalid'],
  ['unique slug',                'ada-and-alan', 'ok'],
  ['no such slug',               'no-such-wedding', 'not-found'],
];
console.log('');
for (const [label, slug, want] of CASES) {
  const r = resolveWeddingBySlug(PROD, slug, { context: 'test' });
  const got = r.ok ? 'ok' : r.reason;
  const ok = got === want;
  if (!ok) bad++;
  console.log(`  ${ok ? '✅' : '❌'} ${label.padEnd(28)} ${got}${r.ids ? ` [${r.ids.length} ids named]` : ''}`);
}

// Ambiguity must name every id, or the rows cannot be found to be fixed.
const amb = resolveWeddingBySlug(PROD, 'tulum-test', { context: 'test' });
const named = amb.ids && amb.ids.length === 2;
if (!named) bad++;
console.log(`  ${named ? '✅' : '❌'} ambiguity names every id     ${amb.ids ? amb.ids.join(', ') : 'none'}`);

console.log(`\n  ${bad ? bad + ' FAILING' : 'all clear'}\n`);
process.exit(bad ? 1 : 0);
