/**
 * tests/persistence/faith-options.mjs
 *
 * TWENTY-TWO FAITH OPTIONS, IN THE ORDER THE OWNER RULED, AND NOTHING STORED
 * STOPS WORKING.
 *
 * Item 2 of goals/2026-10-11-dashboard-fixes-batch-1.md.
 *
 * WHY THE ORDER IS GUARDED AND NOT JUST THE CONTENTS. The ruling is not "these
 * values in any order": Non-religious is pinned first and excluded from the
 * alphabetical run, Other is last, and everything between is alphabetical. All
 * three parts are separate ways to get it wrong, and a list that drifts out of
 * order is the kind of thing nobody reports and everybody notices.
 *
 * WHY _STYLE_TO_FAITH IS READ. It maps old onboarding answers onto faith
 * values. If an option it targets left the list, the mapping would still run
 * and would still write theme.faith, and the Theme tab would then show nothing
 * selected for a record it had just written. The nine targets are extracted
 * from the real source rather than retyped here, so the check cannot go stale
 * against it.
 *
 * WHY THE SCHEMA IS CHECKED. theme.faith is a free string. That is the whole
 * reason this item needs no schema change and no migration, so it is asserted:
 * the day it becomes an enum, every value not in the enum stops saving and this
 * item's promise that "existing stored values keep working" quietly ends.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAITH_OPTIONS, FAITH_FOR_INTERFAITH } from '../../src/lib/weddingThemeOptions.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Exactly what the owner enumerated, plus the kept 'Christian'. */
const EXPECTED = [
  'Non-religious',
  'Anglican', "Baha'i", 'Baptist', 'Buddhist', 'Catholic', 'Christian',
  'Christian (non-denominational)', 'Eastern Orthodox', 'Hindu', 'Interfaith',
  'Jain', 'Jewish', 'Lutheran', 'Methodist', 'Muslim', 'Pentecostal',
  'Presbyterian', 'Sikh', 'Spiritual', 'Taoist',
  'Other',
];

/** The nine values the previous nine-option list offered. */
const PREVIOUS_NINE = ['Buddhist', 'Catholic', 'Christian', 'Hindu', 'Interfaith',
  'Jewish', 'Muslim', 'Non-religious', 'Sikh'];

export async function runFaithOptions() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const theme = code('src/components/event-details/ThemeSection.jsx');
  const step5 = code('src/components/onboarding/OnboardingStep5WeddingType.jsx');
  const eventDetails = code('src/pages/EventDetails.jsx');
  const mirror = code('base44/entities/WeddingDetails.jsonc');

  // ── 1. The list ───────────────────────────────────────────────────────
  ok('the list is the twenty-two the ruling enumerates',
     FAITH_OPTIONS.length === 22, `${FAITH_OPTIONS.length} options`);
  ok('  exactly, in order, with nothing added or dropped',
     FAITH_OPTIONS.join('|') === EXPECTED.join('|'),
     FAITH_OPTIONS.filter((f, i) => f !== EXPECTED[i]).join(', ') || 'identical');
  ok('  and no duplicates',
     new Set(FAITH_OPTIONS).size === FAITH_OPTIONS.length, `${new Set(FAITH_OPTIONS).size} unique`);

  ok('Non-religious is pinned first', FAITH_OPTIONS[0] === 'Non-religious', FAITH_OPTIONS[0]);
  ok('Other is last', FAITH_OPTIONS[FAITH_OPTIONS.length - 1] === 'Other', FAITH_OPTIONS.slice(-1)[0]);

  // THE MIDDLE IS ALPHABETICAL, and the two pinned entries are excluded from
  // it rather than sorted among the rest, which is the ruling's own wording.
  const middle = FAITH_OPTIONS.slice(1, -1);
  const sorted = [...middle].sort((a, b) => a.localeCompare(b, 'en'));
  ok('  everything between them is alphabetical',
     middle.join('|') === sorted.join('|'),
     middle.find((f, i) => f !== sorted[i]) || 'in order');
  ok('  Non-religious is not sorted among them',
     !middle.includes('Non-religious'), 'excluded');
  ok('  and Other is not either', !middle.includes('Other'), 'excluded');

  // ── 2. Nothing stored stops working ──────────────────────────────────
  for (const f of PREVIOUS_NINE) {
    ok(`the stored value "${f}" is still an option`, FAITH_OPTIONS.includes(f), 'present');
  }
  ok('plain Christian is kept, which is the one the new list omitted',
     FAITH_OPTIONS.includes('Christian'), 'kept');
  ok('  and it is distinct from the non-denominational entry',
     FAITH_OPTIONS.includes('Christian (non-denominational)')
       && FAITH_OPTIONS.indexOf('Christian') < FAITH_OPTIONS.indexOf('Christian (non-denominational)'),
     'both, in that order');

  ok('theme.faith is still a free string, so no stored value is refused',
     /"faith":\s*\{\s*"type":\s*"string"\s*\}/.test(mirror.replace(/\s+/g, ' ')),
     'no enum');

  // ── 3. The Interfaith sub-pick ────────────────────────────────────────
  ok('the sub-pick is the same list minus Interfaith',
     FAITH_FOR_INTERFAITH.join('|') === FAITH_OPTIONS.filter((f) => f !== 'Interfaith').join('|'),
     `${FAITH_FOR_INTERFAITH.length} options`);
  ok('  Interfaith cannot be picked as one of its own two halves',
     !FAITH_FOR_INTERFAITH.includes('Interfaith'), 'excluded');
  ok('  Non-religious is pinned first there too',
     FAITH_FOR_INTERFAITH[0] === 'Non-religious', FAITH_FOR_INTERFAITH[0]);
  ok('  and it is derived from the one list, not retyped',
     /FAITH_FOR_INTERFAITH = FAITH_OPTIONS\.filter/.test(code('src/lib/weddingThemeOptions.js')),
     'derived');

  // ── 4. The old onboarding mapping still lands on real options ─────────
  //
  // Extracted from the source, so this cannot drift against the real map.
  const mapBlock = eventDetails.slice(
    eventDetails.indexOf('const _STYLE_TO_FAITH'),
    eventDetails.indexOf('};', eventDetails.indexOf('const _STYLE_TO_FAITH')),
  );
  const targets = [...mapBlock.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  ok('_STYLE_TO_FAITH was found in the source, not assumed',
     targets.length >= 9, `${targets.length} target(s)`);
  for (const t of [...new Set(targets)]) {
    ok(`  it maps onto "${t}", which is still an option`, FAITH_OPTIONS.includes(t), 'valid');
  }

  // ── 5. Both surfaces, one list, one pill size ─────────────────────────
  // IMPORTED, not merely MENTIONED. This read `includes('FAITH_OPTIONS')`,
  // which a plant satisfied by deleting the import and leaving the use site:
  // the symbol was still in the file, undefined at runtime, and eslint's
  // no-undef is off in this repo so nothing else would have caught it. The
  // check now reads the import statement that names it.
  const importsFaithFrom = (src) => {
    const m = src.match(/import \{([\s\S]*?)\} from '@\/lib\/weddingThemeOptions'/);
    return !!m && /\bFAITH_OPTIONS\b/.test(m[1]) && /\bFAITH_FOR_INTERFAITH\b/.test(m[1]);
  };
  ok('the Theme tab imports the shared list by name',
     importsFaithFrom(theme) && !/const FAITH_OPTIONS\s*=/.test(theme), 'imported');
  ok('onboarding imports the same one',
     importsFaithFrom(step5) && !/const FAITH_OPTIONS\s*=/.test(step5), 'imported');

  // ALL FAITH PILLS ARE ONE SIZE. The sub-pick was compact and the main list
  // was not, so the same question was asked at two sizes.
  const liveTheme = stripComments(theme, { trailing: true });
  const faithBlock = liveTheme.slice(
    liveTheme.indexOf('FAITH_OPTIONS.map'),
    liveTheme.indexOf('</OptionAccordionSection>', liveTheme.indexOf('FAITH_OPTIONS.map')),
  );
  ok('no faith pill asks for the compact size',
     faithBlock.length > 0 && !/size="compact"/.test(faithBlock), 'one size');
  ok('  including the Interfaith row',
     /FAITH_FOR_INTERFAITH\.map\(opt => \(\s*<OptionPill key=\{opt\} label=\{opt\}\s*\n?\s*selected=/.test(liveTheme),
     'no size prop');
  ok('the culture sub-picks keep theirs, which is a different question',
     (liveTheme.match(/size="compact"/g) || []).length === 2, 'two left, both culture');
  ok('onboarding renders both rows through one pill component',
     /pillRow\(FAITH_OPTIONS/.test(step5) && /pillRow\(FAITH_FOR_INTERFAITH/.test(step5),
     'one helper');

  // ── 6. Copy rules ─────────────────────────────────────────────────────
  ok('no em or en dash in any option',
     FAITH_OPTIONS.every((f) => !/[—–]/.test(f)), 'clean');
  ok('  nothing shouting',
     FAITH_OPTIONS.every((f) => f !== f.toUpperCase()), 'sentence case');
  ok('  and no option is blank or padded',
     FAITH_OPTIONS.every((f) => f === f.trim() && f.length > 0), 'trimmed');

  return results;
}
