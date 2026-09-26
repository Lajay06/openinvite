/**
 * Dress code: pills and a note, and the editor shows what guests see.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Goal 2026-09-25, item 3. Twelve pills plus "Add your own", up to six per
 * event, one 160-character note beneath. The legacy `dressCode` string stays as
 * the fallback — no backfill, no migration. On the guest site pills render
 * through dressCodeLine()'s array form; the note renders beneath when
 * non-empty; with no pills the legacy string shows exactly as it does today.
 * The per-event styling quiz reads pills first, then the string.
 *
 * "Editors show what guests see: no pill or note appears in an editor that does
 * not appear on the guest site."
 *
 * ── HOW THAT LAST RULE IS KEPT, RATHER THAN HOPED FOR ──────────────────────
 *
 * Both surfaces ask ONE function — resolveDressCode — what an event's dress
 * code is, instead of each reading three fields and deciding for itself. That
 * is the only arrangement under which the two cannot drift, and it is what this
 * guard pins: the editor seeds its pills from the resolver, the guest page
 * spreads the resolver onto every event it builds, and getWeddingEvents (which
 * feeds the quiz) resolves too.
 *
 * ── NO SCHEMA DEPENDENCY ON CUSTOM EVENTS ──────────────────────────────────
 *
 * dressCodePills and dressCodeNotes are declared on mainCeremony and reception
 * only. On preWeddingEvents[] / postWeddingEvents[] items they are UNDECLARED,
 * like the other twenty-one fields those items carry, because those items are
 * bare `{ "type": "object" }`. Declaring two properties there was tried on
 * 2026-09-25 and reverted the same day: it would have given the item a property
 * list of two and left everything else undeclared, and a custom entity silently
 * drops what it does not declare. This guard asserts the arrays stay bare.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const EDITOR = strip(read('src/pages/EventDetails.jsx'));
const GUEST = strip(read('src/components/guest-website/pages/WeddingCelebrationPage.jsx'));
const EVENTS = strip(read('src/lib/weddingEvents.js'));
const QUIZ = strip(read('src/lib/stylingQuizPrompt.js'));

export async function runDressCodePills() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Dress code — pills, a note, and one resolver behind both surfaces:\n');

  let D = {};
  try { D = await import('../../src/lib/dressCode.js'); } catch { /* reported below */ }
  check('the resolver is a module both surfaces can import',
    typeof D.resolveDressCode === 'function', 'src/lib/dressCode.js');

  // ── the editor shows what guests see ─────────────────────────────────────
  check('the editor seeds its pills from the resolver, not from the raw field',
    /dressCodePills: resolveDressCode\(event\)\.pills/.test(EDITOR), 'same precedence as the guest site');
  check('  it offers the twelve from the shared list, never its own copy',
    /DRESS_CODE_PILLS\.map/.test(EDITOR) && !/const DRESS_CODE_PILLS/.test(EDITOR), 'imported');
  check('  "Add your own" is there', /Add your own/.test(EDITOR), 'custom pills');
  check('  the count is visible, so the cap is not a surprise',
    /\{form\.dressCodePills\.length\} of \{MAX_DRESS_CODE_PILLS\}/.test(EDITOR), 'n of 6');
  check('  the note field is capped in the markup too, not only on read',
    /maxLength=\{DRESS_CODE_NOTES_MAX\}/.test(EDITOR), 'maxLength');
  check('  and the legacy string is still written, so nothing is lost',
    /dressCode: form\.dressCode,/.test(EDITOR), 'no backfill, no loss');
  check('both new fields are saved on every event',
    /dressCodePills: form\.dressCodePills,/.test(EDITOR) && /dressCodeNotes: form\.dressCodeNotes,/.test(EDITOR)
      && /dressCodePills: saved\.dressCodePills,/.test(EDITOR), 'form and record');

  // ── the guest site ───────────────────────────────────────────────────────
  // NAMED, NOT SPREAD, and this check changed with it. The first version
  // spread resolveDressCode onto each event; every event here already has its
  // own `notes`, so the spread collided and the dress-code note was overwritten
  // before it could render. The 390/1440 render guard caught it. Each builder
  // now names both fields, so there are two calls per event, not one spread.
  check('the guest page resolves all three builders — ceremony, reception, custom',
    (GUEST.match(/pills: resolveDressCode\(/g) || []).length === 3
      && (GUEST.match(/dressCodeNotes: resolveDressCode\(/g) || []).length === 3,
    'three of each');
  check('  and never spreads the resolver over an event that has its own notes',
    !/\.\.\.resolveDressCode\(/.test(GUEST), 'no collision');
  check('  and renders one pill each', /ev\.pills\.map\(/.test(GUEST), 'every pill');
  check('  with the note beneath, only when it says something',
    /\{ev\.dressCodeNotes && \(/.test(GUEST), 'conditional');
  check('  and no bare dressCode read is left behind',
    !/ev\.dressCode\b/.test(GUEST), 'one source');

  // ── the quiz reads pills first ───────────────────────────────────────────
  check('getWeddingEvents hands the quiz the resolved pills',
    /dressCode: resolveDressCode\(mc\)\.pills/.test(EVENTS) && /dressCode: resolveDressCode\(e\)\.pills/.test(EVENTS),
    'pills, not the raw string');
  check('  and dressCodeLine already accepts an array, so the prompt is unchanged',
    /if \(Array\.isArray\(dressCode\)\) return dressCode\.filter\(Boolean\)\.join\(', '\)/.test(QUIZ),
    'no prompt change needed');

  // ── no schema dependency on custom events ────────────────────────────────
  const MIRROR = JSON.parse(read('base44/entities/WeddingDetails.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  for (const arr of ['preWeddingEvents', 'postWeddingEvents']) {
    check(`${arr}[] is still a bare object — these two fields are undeclared there, like every other`,
      JSON.stringify(MIRROR.properties[arr].items) === '{"type":"object"}',
      JSON.stringify(MIRROR.properties[arr].items));
  }
  for (const ev of ['mainCeremony', 'reception']) {
    check(`  ${ev} declares both, because it has a property list to declare them in`,
      !!MIRROR.properties[ev].properties.dressCodePills && !!MIRROR.properties[ev].properties.dressCodeNotes,
      'declared');
  }

  // THE SOURCE CHECKS RAN FIRST ON PURPOSE. Without the module there is no
  // precedence to assert, but every surface is still readable — and naming each
  // unmet part of the ruling says far more than one failure and a stop.
  if (typeof D.resolveDressCode !== 'function') return results;

  const { resolveDressCode, togglePill, addCustomPill,
    DRESS_CODE_PILLS, MAX_DRESS_CODE_PILLS, DRESS_CODE_NOTES_MAX, DRESS_CODE_NOTES_PLACEHOLDER } = D;

  // ── the vocabulary, exactly as ruled ──────────────────────────────────────
  check('twelve pills, in the order given',
    JSON.stringify(DRESS_CODE_PILLS) === JSON.stringify([
      'Black tie', 'Black tie optional', 'Cocktail', 'Formal', 'Semi-formal',
      'Smart casual', 'Casual', 'Garden party', 'Beach formal', 'Festive',
      'Traditional dress welcome', 'Comfortable shoes']),
    `${DRESS_CODE_PILLS.length} pills`);
  check('  formal to practical, not alphabetised',
    DRESS_CODE_PILLS.indexOf('Black tie') < DRESS_CODE_PILLS.indexOf('Casual'), 'a scale, not a sort');
  check('up to six per event', MAX_DRESS_CODE_PILLS === 6, String(MAX_DRESS_CODE_PILLS));
  check('notes are one line of 160', DRESS_CODE_NOTES_MAX === 160, String(DRESS_CODE_NOTES_MAX));
  check('  with the placeholder as written',
    DRESS_CODE_NOTES_PLACEHOLDER === "Anything guests should know — heels and grass, a chilly courtyard, a color you'd love to see.",
    DRESS_CODE_NOTES_PLACEHOLDER);

  // ── precedence: pills, else the legacy string ─────────────────────────────
  check('pills win when there are pills',
    JSON.stringify(resolveDressCode({ dressCode: 'Black tie', dressCodePills: ['Cocktail'] }).pills) === '["Cocktail"]',
    'pills first');
  check('  the legacy string renders as one pill when there are none',
    JSON.stringify(resolveDressCode({ dressCode: 'Black tie' }).pills) === '["Black tie"]', 'fallback');
  check('  and it is flagged as the fallback, so a surface can tell',
    resolveDressCode({ dressCode: 'Black tie' }).fromLegacy === true
      && resolveDressCode({ dressCodePills: ['Cocktail'] }).fromLegacy === false, 'fromLegacy');
  check('an event with neither renders nothing',
    resolveDressCode({}).pills.length === 0 && resolveDressCode(null).pills.length === 0, 'empty, not a crash');

  // ── the shapes a record actually arrives in ───────────────────────────────
  check('junk and duplicates are dropped',
    JSON.stringify(resolveDressCode({ dressCodePills: ['Cocktail', '', 7, 'Cocktail', ' Festive '] }).pills)
      === '["Cocktail","Festive"]', 'strings, trimmed, deduped');
  check('  a longer array than the cap is clamped, not trusted',
    resolveDressCode({ dressCodePills: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }).pills.length === MAX_DRESS_CODE_PILLS,
    'six');
  check('  and an over-long note is clamped',
    resolveDressCode({ dressCodeNotes: 'x'.repeat(400) }).notes.length === DRESS_CODE_NOTES_MAX, '160');

  // ── the cap holds against the toggle, and custom pills dedupe ─────────────
  check('the cap cannot be exceeded by tapping',
    togglePill(['a', 'b', 'c', 'd', 'e', 'f'], 'g').length === 6, 'unchanged at the cap');
  check('  but a selected pill can always be turned off',
    togglePill(['a', 'b', 'c', 'd', 'e', 'f'], 'f').length === 5, 'toggles off');
  check('a typed pill matching one already there is not added twice',
    JSON.stringify(addCustomPill(['Cocktail'], 'cocktail')) === '["Cocktail"]', 'case-insensitive');
  check('  and a genuinely new one is', JSON.stringify(addCustomPill(['Cocktail'], 'Shoes off'))
    === '["Cocktail","Shoes off"]', 'added');


  return results;
}
