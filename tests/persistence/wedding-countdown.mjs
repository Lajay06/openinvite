/**
 * tests/persistence/wedding-countdown.mjs
 *
 * "HAPPY 0 DAY", AND THE FOUR PLACES THE SAME DEFECT WAS SITTING.
 *
 * Owner report: on the wedding day the daily brief read "Happy 0 day". It is a
 * GENERATED sentence, and the reason it could be generated was in the prompt:
 * DailyUpdate.jsx handed the model `(0 days away)` as a bare number and asked
 * for a "days headline", with nothing anywhere telling it what 0 means.
 *
 * The authored fallbacks beside it already got 0 and 1 right, which is why the
 * couples who saw it were the ones with enough data for Ava to speak at all —
 * the correct branch was the one nobody with a real wedding reached.
 *
 * Four more, each computing the number itself and each phrasing it its own way:
 * "1 days to go" in the top bar and in Next up, "0 days to go" in a digest
 * subject line, and two states that never ended — "Your wedding day has
 * arrived!" and "Today's the day" printing every day after the wedding,
 * forever. The exclamation mark was in product chrome, where they are barred.
 *
 * All five now read one module. These are its rules, and the dates are planted
 * rather than waited for.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { daysUntilWedding, countdownLabel, countdownSentence, countdownForPrompt, isPastWedding } from '../../src/lib/weddingCountdown.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const code = (p) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

export async function runWeddingCountdown() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  The countdown — one computation, one vocabulary, five surfaces:\n');

  // ── PLANTED DATES ───────────────────────────────────────────────────────
  const NOW = new Date(2027, 5, 12, 9, 30);           // 12 June 2027, mid-morning
  const CASES = [
    ['today',      '2027-06-12',  0],
    ['tomorrow',   '2027-06-13',  1],
    ['yesterday',  '2027-06-11', -1],
    ['+30',        '2027-07-12', 30],
    ['no date',    null,       null],
  ];
  for (const [label, date, expected] of CASES) {
    const got = daysUntilWedding(date, NOW);
    check(`${label}: the count is ${expected}`, got === expected, `${got}`);
  }

  // ── THE ONE THE OWNER REPORTED ──────────────────────────────────────────
  check('TODAY never produces a numeral beside the word day',
    countdownLabel(0) === 'Today' && countdownSentence(0) === 'Today is the day.'
      && !/0/.test(countdownLabel(0)) && !/0/.test(countdownSentence(0)),
    `"${countdownLabel(0)}" / "${countdownSentence(0)}"`);
  check('  and the model is told the words rather than handed the number',
    /Never write the numeral 0/.test(countdownForPrompt(0)) && !/^0 /.test(countdownForPrompt(0)),
    countdownForPrompt(0).slice(0, 58) + '…');

  // ── SINGULAR, PLURAL, AND THE PAST ──────────────────────────────────────
  check('tomorrow is "Tomorrow", never "1 days"',
    countdownLabel(1) === 'Tomorrow' && !/1 days/.test(countdownLabel(1)), countdownLabel(1));
  check('  two or more is plural', countdownLabel(2) === '2 days to go', countdownLabel(2));
  check('  thirty is plural', countdownLabel(30) === '30 days to go', countdownLabel(30));
  check('after the wedding there is NO countdown, in either form',
    countdownLabel(-1) === null && countdownSentence(-1) === null && countdownLabel(-400) === null,
    'null, so the caller renders the wrap-up state (spec section 11)');
  check('  and isPastWedding says so, rather than a caller testing < 0 itself',
    isPastWedding(-1) === true && isPastWedding(0) === false && isPastWedding(null) === false, 'true / false / false');
  check('  the model is told it is over, and told not to mention an anniversary',
    /It is over/.test(countdownForPrompt(-1)) && /anniversary/.test(countdownForPrompt(-1)),
    'spec section 11: no anniversary marketing, no re-engagement copy');
  check('no date yields nothing to say, and no invented countdown',
    countdownLabel(null) === null && /Do not invent/.test(countdownForPrompt(null)), 'null');

  // ── THE COUNT IS BETWEEN CALENDAR DAYS, NOT INSTANTS ────────────────────
  {
    const hours = [0, 6, 12, 18, 23].map((h) => daysUntilWedding('2027-06-12', new Date(2027, 5, 12, h, 0)));
    check('the same calendar day reads the same at every hour',
      new Set(hours).size === 1 && hours[0] === 0, `[${hours.join(', ')}]`);
    const eve = [0, 9, 23].map((h) => daysUntilWedding('2027-06-12', new Date(2027, 5, 11, h, 0)));
    check('  and the day before reads 1 at every hour',
      new Set(eve).size === 1 && eve[0] === 1, `[${eve.join(', ')}]`);

    // PLANT: the old computation, on the same two days.
    const old = (d, now) => Math.ceil((new Date(d) - now) / 86400000);
    const oldHours = [0, 9, 18, 23].map((h) => old('2027-06-12', new Date(2027, 5, 11, h, 0)));
    check('PLANT: the old Math.ceil between instants disagrees with itself across a day',
      new Set(oldHours).size > 1, `the day before read [${oldHours.join(', ')}] at 0/9/18/23h`);
  }

  // ── EVERY SURFACE READS THE MODULE ──────────────────────────────────────
  {
    const FILES = [
      ['src/Layout.jsx', 'the dashboard top bar'],
      ['src/components/dashboard/NextUp.jsx', 'Next up'],
      ['src/pages/DailyUpdate.jsx', 'the daily brief'],
      ['src/lib/weeklyDigestEmailTemplate.js', 'the weekly digest'],
    ];
    for (const [file, what] of FILES) {
      check(`${what} reads the shared countdown`,
        /weddingCountdown/.test(src(file)), file);
    }
    const rolled = FILES.filter(([f]) => /Math\.ceil\(\(new Date\([^)]*\) - new Date\(\)\)/.test(code(f)));
    check('  and none of them still computes the number itself',
      rolled.length === 0, rolled.map(([f]) => f).join(', ') || '0 hand-rolled computations left');

    const bad = [];
    for (const [file] of FILES) {
      const c = code(file);
      if (/\$\{days(ToGo|Until)\} days to go/.test(c)) bad.push(`${file}: raw "\${n} days to go"`);
      if (/wedding day has arrived!/.test(c)) bad.push(`${file}: the exclamation mark in chrome`);
    }
    check('  no surface prints a raw count or an exclamation mark in chrome',
      bad.length === 0, bad.join(' | ') || 'none');
  }

  // ── THE PROMPT, WHICH IS WHERE THE REPORTED BUG ACTUALLY LIVED ──────────
  {
    const daily = code('src/pages/DailyUpdate.jsx');
    check('the briefing prompt sends the resolved phrase, not a bare number',
      /countdownForPrompt\(days\)/.test(daily) && !/\(\$\{days \?\? 'unknown'\} days away\)/.test(daily),
      'countdownForPrompt(days)');
  }

  return results;
}
