/**
 * The mirror carries the 2026-09-25 declarations, and no array item was narrowed.
 *
 * ── RULE 12 ────────────────────────────────────────────────────────────────
 *
 * base44/entities/*.jsonc is a MIRROR of a schema the owner applies live. Any
 * PR building against a newly applied declaration syncs the mirror in the same
 * PR, read from the live schema and never copied forward from the old mirror.
 *
 * Seven paths were declared on 2026-09-25 and verified field-by-field against
 * a live export before this mirror was written: guidanceState and its two
 * members, dressCodePills and dressCodeNotes on mainCeremony and on reception,
 * and Music.playlist and Music.categoryOther.
 *
 * ── THE NARROWING THIS GUARD EXISTS FOR ────────────────────────────────────
 *
 * The first attempt at those declarations also put dressCodePills and
 * dressCodeNotes on preWeddingEvents[] and postWeddingEvents[]. Those items
 * are bare `{ "type": "object" }` — no properties at all — which is what lets
 * a custom event carry the twenty-one fields EventDetails writes into it.
 * Declaring two properties on such an item gives it a property LIST, and a
 * custom entity silently drops what it does not declare (BASE44_PLATFORM_NOTES,
 * confirmed empirically 2026-07). So every other field on every pre- and
 * post-wedding event was one save away from being discarded: name, date,
 * venueName, dressCode, the lot.
 *
 * The owner reverted it the same day, and Base44 reported zero WeddingDetails
 * rows updated in between, so nothing was lost. This guard is the part that
 * makes sure it cannot come back quietly: a bare object item that acquires
 * `properties`, `items`, `enum`, `required` or `additionalProperties` fails
 * here, by path.
 *
 * WHY A SHAPE CHECK AND NOT A FIELD LIST. The first diff of that change
 * compared PATH LISTS and reported "additive only, nothing dropped" — which
 * was true of the paths and completely missed the narrowing, because the
 * mirror had no paths under those items to compare against. A guard that
 * counts fields would have passed too. This one compares shape.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);

/** The mirror is JSONC. Strip line comments only, exactly as the generator does. */
function loadMirror(name) {
  const text = readFileSync(root(`base44/entities/${name}.jsonc`), 'utf8');
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, ''));
}

const CONSTRAINTS = ['properties', 'items', 'enum', 'required', 'additionalProperties',
  'patternProperties', 'oneOf', 'anyOf', 'allOf'];

/** Every array-of-object item that declares nothing — the free-form ones. */
const FREE_FORM = [
  'preWeddingEvents', 'postWeddingEvents', 'qna', 'menuItems', 'polls',
];

export async function runMirrorDeclaresTheNewFields() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  The mirror — the 2026-09-25 declarations, and nothing narrowed:\n');

  const wd = loadMirror('WeddingDetails');
  const music = loadMirror('Music');

  // ── guidanceState ─────────────────────────────────────────────────────────
  const gs = wd.properties.guidanceState;
  check('guidanceState is declared', !!gs && gs.type === 'object', gs ? gs.type : 'MISSING');
  check('  tourSeenAt is a nullable string, not a boolean',
    JSON.stringify(gs?.properties?.tourSeenAt?.type) === '["string","null"]',
    JSON.stringify(gs?.properties?.tourSeenAt?.type));
  check('  dismissed is an array of strings',
    gs?.properties?.dismissed?.type === 'array' && gs?.properties?.dismissed?.items?.type === 'string',
    JSON.stringify(gs?.properties?.dismissed));

  // ── dress code, on the two fixed events only ──────────────────────────────
  for (const ev of ['mainCeremony', 'reception']) {
    const p = wd.properties[ev]?.properties || {};
    check(`${ev} declares dressCodePills as an array of strings`,
      p.dressCodePills?.type === 'array' && p.dressCodePills?.items?.type === 'string',
      JSON.stringify(p.dressCodePills));
    check(`  ${ev} declares dressCodeNotes as a string`,
      p.dressCodeNotes?.type === 'string', JSON.stringify(p.dressCodeNotes));
    check(`  ${ev} keeps dressCode, the fallback for weddings that answered first`,
      p.dressCode?.type === 'string', JSON.stringify(p.dressCode));
  }

  // ── AND NOT on the custom-event arrays ────────────────────────────────────
  for (const arr of ['preWeddingEvents', 'postWeddingEvents']) {
    const items = wd.properties[arr]?.items;
    check(`${arr}[] is still a bare object — no property list to drop against`,
      JSON.stringify(items) === '{"type":"object"}', JSON.stringify(items));
  }

  // ── nothing anywhere went from free-form to constrained ───────────────────
  for (const arr of FREE_FORM) {
    const items = wd.properties[arr]?.items;
    if (!items) { check(`${arr} exists`, false, 'MISSING'); continue; }
    const added = CONSTRAINTS.filter((k) => k in items);
    check(`  ${arr}[] constrains nothing`, added.length === 0,
      added.length ? `NARROWED by ${added.join(', ')}` : 'bare');
  }

  // ── Music ─────────────────────────────────────────────────────────────────
  check('Music.playlist is declared', music.properties.playlist?.type === 'string',
    JSON.stringify(music.properties.playlist));
  check('Music.categoryOther is declared', music.properties.categoryOther?.type === 'string',
    JSON.stringify(music.properties.categoryOther));
  check('  and category is still the fixed six — categoryOther sits beside it',
    JSON.stringify(music.properties.category?.enum) === JSON.stringify(
      ['ceremony', 'cocktail_hour', 'dinner', 'dancing', 'special_moments', 'general']),
    JSON.stringify(music.properties.category?.enum));

  // ── the derived file was regenerated in the same commit ───────────────────
  const gen = readFileSync(root('src/lib/entityFields.generated.js'), 'utf8');
  check('entityFields.generated.js was regenerated alongside the mirror',
    /"guidanceState"/.test(gen) && /"playlist"/.test(gen) && /"categoryOther"/.test(gen),
    'all three in the generated map');

  // ── rls untouched ─────────────────────────────────────────────────────────
  check('WeddingDetails rls is unchanged — world-readable, owner-writable',
    wd.rls?.create === null && wd.rls?.read === null
      && wd.rls?.update?.created_by_id === '{{user.id}}', JSON.stringify(wd.rls));

  return results;
}
