/**
 * tests/persistence/guest-category-blank.mjs
 *
 * A GUEST NOBODY CATEGORISED IS NOT FAMILY.
 *
 * Owner report: adding a guest without choosing a side or group produced
 * "Family". GuestForm.jsx seeded `category: 'family'` into its new-guest
 * state, so the field arrived at the database looking chosen. It is the worst
 * shape of a wrong default: invisible, because the form reads as filled in
 * rather than skipped, and cumulative, because every uncategorised guest
 * inflates one real bucket that someone will later count.
 *
 * WHAT THIS ASSERTS, AND WHY IT IS SOURCE-READ. The default lives in a
 * useState initialiser inside a .jsx component, which plain Node cannot
 * import. Reading the source for the literal is the honest instrument here:
 * the defect WAS a literal, and a rendered test of a form that has no default
 * would be asserting the absence of something by clicking around it.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTITY_FIELDS } from '../../src/lib/entityFields.generated.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export async function runGuestCategoryBlank() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  A guest nobody categorised is blank, not family:\n');

  const form = code('src/components/guests/GuestForm.jsx');

  // ── THE DEFAULT ─────────────────────────────────────────────────────────
  const initial = form.match(/useState\(guest \|\| \{[\s\S]*?\}\);/);
  check('the new-guest form has an initial-state block to read', !!initial, initial ? 'found' : 'NOT FOUND');
  check('category starts BLANK', /category: '',/.test(initial?.[0] || ''),
    (initial?.[0].match(/category: [^,]+,/) || ['absent'])[0]);
  check("  and not 'family'", !/category: 'family'/.test(initial?.[0] || ''), 'no family default');
  check('  no other field was disturbed by the change',
    /rsvp_status: 'pending'/.test(initial?.[0] || '') && /plus_one: false/.test(initial?.[0] || ''),
    'rsvp_status and plus_one unchanged');

  // ── BLANK IS NOT AN ENUM VALUE, AND THAT IS FINE ────────────────────────
  //
  // Base44 does not enforce enums (BASE44_PLATFORM_NOTES, gotcha #20), so a
  // blank stores as blank. The point of checking is the opposite direction:
  // 'family' IS a real value, which is exactly why defaulting to it was
  // indistinguishable from a choice.
  check("'family' is a real enum value, which is what made the default invisible",
    ENTITY_FIELDS.Guest.enums.category.includes('family'),
    ENTITY_FIELDS.Guest.enums.category.join(', '));
  check('  category is not a required field, so blank is a legal record',
    !ENTITY_FIELDS.Guest.required.includes('category'),
    `required: ${ENTITY_FIELDS.Guest.required.join(', ') || '(none)'}`);

  // ── EVERY CONSUMER TREATS BLANK AS BLANK ────────────────────────────────
  {
    const csv  = code('src/pages/Guests.jsx');
    const list = code('src/components/guests/GuestList.jsx');
    check('the CSV export writes an empty cell, not a bucket',
      /g\.category \|\| ''/.test(csv), "g.category || ''");
    check('the sort accessor sorts blanks together rather than under Family',
      /category: \{ getValue: g => g\.category \|\| ''/.test(list), "getValue: g.category || ''");
    check('the badge is conditional, so an uncategorised guest shows no pill',
      /guest\.category \? \(/.test(list), 'guest.category ? …');
    check('  and the family FALLBACK STYLE is only reachable for a set-but-unknown value',
      /CATEGORY_STYLES\[guest\.category\] \|\| CATEGORY_STYLES\.family/.test(list)
        && /guest\.category \? \(/.test(list),
      'guarded by the conditional above it, so blank never lands on family styling');
    check('nothing groups or counts guests by category',
      !/reduce[\s\S]{0,80}\.category/.test(list) && !/groupBy\(.*category/.test(list),
      'no category bucket to inflate');
  }

  // ── PLANT (R19) ─────────────────────────────────────────────────────────
  {
    const planted = (initial?.[0] || '').replace(/category: '',/, "category: 'family',");
    check('PLANT: the old default is detected by the check above',
      /category: 'family'/.test(planted) && !/category: '',/.test(planted),
      'the same assertion rejects the reintroduced literal');
  }

  return results;
}
