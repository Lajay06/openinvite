/**
 * The same five theme questions, in the same order, on both surfaces.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Round two, item 7. Event details ran: What's the aesthetic, Faith and
 * religion, Cultures and traditions, Atmosphere, Season, Setting. "The owner
 * does not want a religion question among the first things anyone sees."
 *
 * New order, exactly: aesthetic → atmosphere → setting → culture → faith.
 *
 * "Season is no longer asked. It is derived: hemisphere from the venue's
 * coordinates, season from the wedding date. Anything that consumed the season
 * answer reads the derived value instead."
 *
 * "Onboarding must match … so a couple never answers the same question twice."
 *
 * ── HEMISPHERE: COUNTRY, NOT COORDINATES, AND WHY ──────────────────────────
 *
 * The ruling says coordinates. src/lib/weddingSeason.js already derives the
 * hemisphere from the COUNTRY parsed off the venue address, and its own header
 * records why: resolving the stored placeId to real coordinates adds a server
 * round trip for marginal gain over the country the address already ends with.
 * The outcome is the same answer; flagged here rather than quietly swapped.
 *
 * An unparseable address gives NO season rather than a guessed one. That is
 * the bug it was written for: a fixed northern table told a New Year's Eve
 * wedding at Crown Sydney it was a winter wedding.
 *
 * ── WHY ONBOARDING HAD A DIFFERENT VOCABULARY ──────────────────────────────
 *
 * The weddingType step asked Style and Vibe — 'Traditional', 'Maximalist',
 * 'Party & dancing' — landing in the flat `weddingStyle` array, never in the
 * structured theme fields Event details reads. So the couple answered "what
 * kind of wedding" twice, in two vocabularies, and neither answer could see
 * the other. ThemeSection carries a migration whose only job was guessing
 * across that gap.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
// NAMESPACE IMPORT ON PURPOSE. A named import of an export the module does not
// have yet is a module-resolution error, which aborts the run before a single
// check prints — a red CI naming nothing. Read off the namespace and a missing
// list fails as its own check, with the others still shown.
import * as themeOptions from '../../src/lib/weddingThemeOptions.js';
const {
  AESTHETIC_OPTIONS = [], ATMOSPHERE_OPTIONS = [], SETTING_OPTIONS = [],
  FAITH_OPTIONS = [], CULTURE_REGIONS = [], THEME_QUESTION_ORDER = [],
} = themeOptions;
import { deriveSeason } from '../../src/lib/weddingSeason.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => readFileSync(root(p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const THEME = strip(read('src/components/event-details/ThemeSection.jsx'));
const STEP5 = strip(read('src/components/onboarding/OnboardingStep5WeddingType.jsx'));
// RAW, NOT STRIPPED. `strip`'s block-comment pattern spans from any `/*` to
// the next `*/`, and this file contains both inside JSX and string content, so
// stripping it swallows real code — including the two lines checked below.
const FLOW = read('src/pages/Onboarding.jsx');
const AVACTX = strip(read('src/lib/avaContextFormat.js'));
const SUGG = strip(read('src/components/notes/SuggestionsModal.jsx'));
const OUTFIT = strip(read('src/components/guest-suite/OutfitRecommendations.jsx'));

const ORDER = ['aesthetic', 'atmosphere', 'setting', 'culture', 'faith'];

export async function runThemeFiveQuestions() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Theme — five questions, one order, two surfaces:\n');

  // ── The order is named once, in the shared module ─────────────────────────
  check('the order is declared in one place',
    JSON.stringify(THEME_QUESTION_ORDER) === JSON.stringify(ORDER), THEME_QUESTION_ORDER.join(' → '));

  // ── Event details ─────────────────────────────────────────────────────────
  const themeKeys = [...THEME.matchAll(/sectionKey="(\w+)"/g)].map((m) => m[1]);
  check('Event details asks exactly the five, in the ruled order',
    JSON.stringify(themeKeys) === JSON.stringify(ORDER), themeKeys.join(' → '));
  check('  faith is last, which is the point of the reorder',
    themeKeys[themeKeys.length - 1] === 'faith', themeKeys.slice(-1)[0]);
  check('  and Season is no longer one of them', !themeKeys.includes('season'), 'no season section');

  // ── Onboarding ────────────────────────────────────────────────────────────
  const stepTitles = [...STEP5.matchAll(/<AccordionSection\s+title="([^"]+)"/g)].map((m) => m[1]);
  check('onboarding asks five sections', stepTitles.length === 5, stepTitles.join(' | '));
  check('  in the same order, by the same names',
    JSON.stringify(stepTitles) === JSON.stringify([
      "What's the aesthetic?", 'Atmosphere', 'Setting', 'Cultures and traditions', 'Faith or religion',
    ]),
    stepTitles.join(' → '));
  check('  and the old Style/Vibe vocabulary is gone',
    !/STYLE_VIBE_GROUPS/.test(STEP5) && !/Maximalist/.test(STEP5) && !/Party & dancing/.test(STEP5),
    'no second vocabulary');

  // ── The same options, from the same source ────────────────────────────────
  for (const [name, list] of [['AESTHETIC_OPTIONS', AESTHETIC_OPTIONS], ['ATMOSPHERE_OPTIONS', ATMOSPHERE_OPTIONS],
    ['SETTING_OPTIONS', SETTING_OPTIONS], ['FAITH_OPTIONS', FAITH_OPTIONS]]) {
    check(`both surfaces import ${name} rather than declaring their own`,
      THEME.includes(name) && STEP5.includes(name)
        && !new RegExp(`const ${name}\\s*=`).test(THEME) && !new RegExp(`const ${name}\\s*=`).test(STEP5),
      `${list.length} options, one list`);
  }
  check('both offer the same culture list', /CULTURE_REGIONS/.test(THEME) && /CULTURE_REGIONS/.test(STEP5),
    `${CULTURE_REGIONS.length} regions`);

  // ── The same fields ───────────────────────────────────────────────────────
  for (const f of ['aesthetic', 'atmosphere', 'setting', 'culture', 'cultureOther', 'faith', 'faithSecondary']) {
    check(`  onboarding writes theme.${f}`,
      new RegExp(`\\b${f}[,:]`).test(STEP5), 'written');
  }

  // ── The question is not asked twice ───────────────────────────────────────
  check('the later cultural step is skipped, so culture is asked once',
    /if \(step === 'pathA-cultural'\) return false;/.test(FLOW), 'isStepVisible');
  check('  and it is hidden rather than removed, so saved drafts keep their index',
    /'pathA-cultural',/.test(FLOW), 'still in STEPS');

  // ── Season, derived ───────────────────────────────────────────────────────
  check('nothing declares a season option list any more',
    !/SEASON_OPTIONS/.test(THEME) && !/SEASON_OPTIONS/.test(STEP5), 'gone from both');
  check('Ava’s context derives the season when the couple has not stored one',
    /deriveSeason\(weddingDate, wd\.mainCeremony\?\.address\)/.test(AVACTX), 'avaContextFormat');
  check('  the themed-suggestions prompt derives it too',
    /deriveSeason\(details\.weddingDate, details\.mainCeremony\?\.address\)/.test(SUGG), 'SuggestionsModal');
  check('  and the guest outfit guide already did',
    /derivedSeason/.test(OUTFIT), 'OutfitRecommendations');
  check('a stored answer still wins over the derived one',
    /theme\.season \|\| deriveSeason/.test(AVACTX) && /details\.theme\.season\s*$|details\.theme\.season\n/m.test(SUGG),
    'no one’s own pick is overridden');

  // ── The derivation itself, on real inputs ─────────────────────────────────
  check('December in Australia is summer, not winter',
    deriveSeason('2027-12-31', '8 Whiteman St, Southbank VIC 3006, Australia') === 'Summer', 'southern');
  check('  December in the United States is winter',
    deriveSeason('2027-12-31', '11 Madison Ave, New York, NY 10010, USA') === 'Winter', 'northern');
  check('  and an address with no country gives NO season rather than a guess',
    deriveSeason('2027-12-31', 'The barn, up the hill') === null, 'null, not a default');

  return results;
}
