/**
 * tests/persistence/meal-choice-contract.mjs
 *
 * Guest.meal_choice and plus_one_meal_choice are free strings holding a menu
 * option ID — either one of the six defaults or a couple-defined id from
 * WeddingDetails.mealOptions, generated per wedding at runtime.
 *
 * The property that has to survive custom menus landing: NOTHING BRANCHES ON A
 * MEAL LITERAL. Every consumer resolves through mealOptionLabel(), which falls
 * back to the defaults and then to the raw value. A `=== 'beef'` anywhere would
 * work perfectly for weddings using the defaults and fail silently for the
 * first couple who defines their own menu — the failure would look like a
 * display bug months after the code shipped.
 *
 * The six ids are allowed to APPEAR (DEFAULT_MEAL_OPTIONS has to list them);
 * what is forbidden is comparing a stored value against one.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const MEALS = ['beef', 'chicken', 'fish', 'vegetarian', 'vegan', 'kids_meal'];

/** The one file allowed to enumerate the six: it defines them. */
const DEFINITION_FILE = 'src/lib/weddingEvents.js';

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

export async function runMealChoiceContract() {
  const results = [];
  const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'api'))];

  // A COMPARISON against a meal literal, not a mention of one.
  //   === 'beef' | !== "beef" | case 'beef' | includes('beef') | ['beef', …]
  const comparisons = MEALS.map(m =>
    new RegExp(`(===|!==|==|!=)\\s*['"\`]${m}['"\`]|['"\`]${m}['"\`]\\s*(===|!==|==|!=)|case\\s+['"\`]${m}['"\`]|includes\\(\\s*['"\`]${m}['"\`]`, 'g'));

  const offenders = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    if (rel === DEFINITION_FILE) continue;
    const code = stripComments(fs.readFileSync(f, 'utf8'));
    const hits = MEALS.filter((m, i) => comparisons[i].test(code));
    if (hits.length) offenders.push(`${rel}: compares against ${hits.join(', ')}`);
  }

  results.push(offenders.length === 0
    ? pass('meal contract — no source compares a stored value against a meal literal', `${files.length} files scanned`)
    : fail('meal contract — no source compares a stored value against a meal literal', 'none',
           `${offenders.join(' | ')} — resolve via mealOptionLabel() instead; a custom menu id would never match`));

  // The definition file must still define all six, or the fallback chain has a
  // hole and this guard is protecting a list that shrank underneath it.
  const def = fs.readFileSync(path.join(ROOT, DEFINITION_FILE), 'utf8');
  const missing = MEALS.filter(m => !new RegExp(`id:\\s*['"\`]${m}['"\`]`).test(def));
  results.push(missing.length === 0
    ? pass('meal contract — DEFAULT_MEAL_OPTIONS still defines all six ids', MEALS.join(', '))
    : fail('meal contract — DEFAULT_MEAL_OPTIONS still defines all six ids', 'all six', `missing: ${missing.join(', ')}`));

  // ── OUR DEFAULTS MUST NEVER IMPERSONATE THE COUPLE'S CHOICES ────────────
  // Meal preference is opt-in: WeddingDetails.mealOptions is the switch, on
  // BOTH surfaces. Before this, RSVPPage and GuestForm each fell back to
  // DEFAULT_MEAL_OPTIONS when the couple had configured nothing — so guests
  // were asked to choose from six options we invented, presented on the
  // couple's own wedding site as the couple's menu, and the couple could
  // record a choice against an id their menu does not contain for a guest who
  // was never asked.
  //
  // The six survive ONLY as a label resolver, for values already stored
  // against historical answers. Any file other than the definition importing
  // them is reaching for a convenient defaults array and reintroducing the
  // defect — which is exactly how it would come back.
  const importers = files
    .filter(f => path.relative(ROOT, f) !== DEFINITION_FILE)
    .filter(f => /import\s*\{[^}]*DEFAULT_MEAL_OPTIONS[^}]*\}/.test(stripComments(fs.readFileSync(f, 'utf8'))))
    .map(f => path.relative(ROOT, f));
  results.push(importers.length === 0
    ? pass('meal contract — nothing outside the definition imports DEFAULT_MEAL_OPTIONS', 'label resolver only')
    : fail('meal contract — nothing outside the definition imports DEFAULT_MEAL_OPTIONS', 'no importers',
           `${importers.join(', ')} — our defaults must not be offered as the couple's menu`));

  // CONTROL: the importer detector must be able to see one, or the assertion
  // above passes for a scan that never matched anything.
  const detects = /import\s*\{[^}]*DEFAULT_MEAL_OPTIONS[^}]*\}/
    .test("import { getWeddingEvents, DEFAULT_MEAL_OPTIONS } from '@/lib/weddingEvents';");
  results.push(detects
    ? pass('meal contract — control: an importing file IS detected', 'detector works')
    : fail('meal contract — control: an importing file IS detected', 'detected', 'the scan cannot see an importer'));

  // Both surfaces must GATE on the couple's menu, not merely prefer it.
  for (const [rel, gate] of [
    ['src/components/rsvp/RSVPPage.jsx', /\{hasMealOptions && \(/],
    ['src/components/guests/GuestForm.jsx', /hasMealOptions \? \(/],
  ]) {
    const code = stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    results.push(gate.test(code) && /const hasMealOptions/.test(code)
      ? pass(`meal contract — ${rel.split('/').pop()} gates on the couple's menu`, 'opt-in')
      : fail(`meal contract — ${rel.split('/').pop()} gates on the couple's menu`, 'gated', 'renders regardless'));
  }

  // A gated control must say why it is absent — the silent-guard defect class.
  const gf = stripComments(fs.readFileSync(path.join(ROOT, 'src/components/guests/GuestForm.jsx'), 'utf8'));
  results.push(/function NoMenuPointer/.test(gf) && /Set up meal options in/.test(gf) && /FoodBeverage/.test(gf)
    ? pass('meal contract — the couple is pointed at Food & beverage, not left guessing', 'linked pointer')
    : fail('meal contract — the couple is pointed at Food & beverage, not left guessing', 'a pointer',
           'the field vanishes with no explanation'));

  // The resolver has to keep its last-resort fallback: an id from a menu option
  // the couple has since deleted must render as itself, never blank.
  const resolverOk = /export function mealOptionLabel/.test(def)
    && /return match \? match\.label : mealChoiceId/.test(def);
  results.push(resolverOk
    ? pass('meal contract — mealOptionLabel falls back to the raw id, never blank', 'fallback intact')
    : fail('meal contract — mealOptionLabel falls back to the raw id, never blank', 'raw-id fallback',
           'a deleted menu option would render blank'));

  // The schema mirror must agree that these are free strings. If it ever goes
  // back to an enum, custom ids stop storing and this guard should say so.
  const guest = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'base44/entities/Guest.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const bad = ['meal_choice', 'plus_one_meal_choice']
    .filter(f => guest.properties?.[f]?.enum || guest.properties?.[f]?.type !== 'string');
  results.push(bad.length === 0
    ? pass('meal contract — both columns are free strings in the mirror, not enums', 'meal_choice, plus_one_meal_choice')
    : fail('meal contract — both columns are free strings in the mirror, not enums', 'string, no enum',
           `${bad.join(', ')} — custom menu ids cannot be stored`));

  return results;
}
