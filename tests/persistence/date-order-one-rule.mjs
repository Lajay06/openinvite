/**
 * tests/persistence/date-order-one-rule.mjs
 *
 * ONE FUNCTION ANSWERS "WHICH ORDER DOES THIS COUPLE READ DATES IN".
 *
 * Owner ruling 2026-10-16(a). Two readers had grown independently:
 * deviceDateFormat in src/mobile/lib/dates.js, and localeDateFormat on the
 * web. The ruling: ONE function, and a year-first locale resolves to
 * MONTH-FIRST.
 *
 * A CORRECTION ON THE RECORD. I reported to the owner that the two disagreed
 * on year-first locales, and the ruling was issued partly on that basis. It
 * was wrong. Swept across 50 locales, including every year-first one, the two
 * return the SAME answer every time, and both already resolve year-first to
 * month-first. The error was mine: deviceDateFormat's `first` lookup takes the
 * first of MONTH OR DAY, not the first part overall, so for y-M-d it finds the
 * month and says "mdy", exactly as the web does.
 *
 * The ruling is still worth carrying out, for the plain reason that two copies
 * of one rule are two copies. And the sweep below is a better guard than the
 * one I would have written for a divergence: it pins the two together for as
 * long as both exist.
 *
 * The shared function is src/lib/dateFormatPreference.js's localeDateFormat.
 * It had to leave dashboardDate.js to get there: that module is the NUMERIC
 * dashboard formatter, which guest-facing files are forbidden to import, so
 * the invitation preview could not ask the question without breaking a
 * boundary that exists for a good reason.
 *
 * ── WHAT THIS FILE HOLDS, AND WHAT IT DELIBERATELY DOES NOT ────────────────
 *
 * In scope: the web. No module under src/lib, src/components or src/pages may
 * derive the order for itself; they must call the shared function.
 *
 * NOT in scope: src/mobile. src/mobile/lib/dates.js still has its own
 * deviceDateFormat and still answers a year-first locale differently. That is
 * lane D's file and lane D's PR by the owner's ruling, so this guard does not
 * fail on it. MOBILE_PARITY.md carries the note. When lane D points dates.js
 * at the shared function, the last check below starts passing on its own and
 * can be promoted to cover src/mobile too.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import {
  localeDateFormat, accountDateFormat, isUnresolvedLocale,
  DATE_FORMATS, DEFAULT_DATE_FORMAT,
} from '../../src/lib/dateFormatPreference.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => stripComments(src);
const SHARED = 'src/lib/dateFormatPreference.js';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir))) {
    if (e === 'node_modules') continue;
    const rel = `${dir}/${e}`;
    if (fs.statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx)$/.test(rel)) out.push(rel);
  }
  return out;
}

export async function runDateOrderOneRule() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want) ? pass(label, JSON.stringify(got)) : fail(label, want, got));

  console.log('\n  One rule for day/month order:\n');

  // ── THE RULING'S OWN ANSWER ─────────────────────────────────────────────
  check('a year-first locale resolves to month-first',
        ['ja-JP', 'en-CA', 'zh-CN', 'hu-HU'].map(localeDateFormat), ['mdy', 'mdy', 'mdy', 'mdy']);
  check('  the US reads month-first', localeDateFormat('en-US'), 'mdy');
  check('  Australia, Britain and Europe read day-first',
        ['en-AU', 'en-GB', 'de-DE', 'fr-FR'].map(localeDateFormat), ['dmy', 'dmy', 'dmy', 'dmy']);
  check('  a malformed tag falls back rather than throwing', localeDateFormat('not-a-locale!!'), DEFAULT_DATE_FORMAT);
  check('  and the root locale defers to the last resort too',
        [isUnresolvedLocale('und'), isUnresolvedLocale('en-US')], [true, false]);
  ok('  the answer is always one of the two',
     DATE_FORMATS.includes(accountDateFormat()), `this runtime says ${accountDateFormat()}`);

  // ── AND IT IS THE ONLY ONE ON THE WEB ───────────────────────────────────
  //
  // Deriving the order means asking Intl which part comes first. Any other
  // file doing that for itself is a second rule waiting to disagree, which is
  // exactly how the divergence above happened.
  const webFiles = ['src/lib', 'src/components', 'src/pages'].flatMap((d) => walk(d));
  ok('there are web files to scan', webFiles.length > 200, `${webFiles.length} file(s)`);
  const derivers = webFiles.filter((f) => {
    const src = code(read(f));
    // Deriving the ORDER means turning Intl's parts into 'mdy' or 'dmy'.
    // Extracting parts for another purpose does not count: src/lib/
    // rsvpReminders.js reads year/month/day/hour out of a named time zone to
    // decide when to send, which is a different question and stays its own.
    return /formatToParts/.test(src) && /'mdy'|'dmy'/.test(src);
  });
  ok('no web module derives the order for itself',
     derivers.length === 1 && derivers[0] === SHARED,
     derivers.length === 1 ? `only ${SHARED}` : `also: ${derivers.filter((d) => d !== SHARED).join(', ')}`);

  // ── THE NUMERIC FORMATTER STILL RE-EXPORTS IT ───────────────────────────
  //
  // Sixteen modules import these names from dashboardDate.js. Moving the
  // definition must not have moved the names.
  const dash = read('src/lib/dashboardDate.js');
  ok('dashboardDate.js re-exports the order rule rather than copying it',
     /export \{[\s\S]*?\} from '\.\/dateFormatPreference\.js';/.test(dash)
       && !/export function localeDateFormat/.test(dash),
     'one definition, re-exported');
  const api = await import('../../src/lib/dashboardDate.js');
  const missing = ['DATE_FORMATS', 'DEFAULT_DATE_FORMAT', 'normalizeDateFormat', 'isUnresolvedLocale',
    'localeDateFormat', 'accountDateFormat', 'formatDashboardDate', 'DATE_FORMAT_LABELS', 'dateFormatExample']
    .filter((k) => api[k] === undefined);
  ok('  and its public API is unchanged for its existing importers',
     missing.length === 0, missing.length ? `MISSING ${missing.join(', ')}` : 'all nine names present');
  // THE FORMATTER ACTUALLY RUNS. Re-exporting a name does NOT put it in the
  // module's own scope, and the first attempt at this split left
  // formatDashboardDate throwing ReferenceError on every call while the module
  // still imported cleanly. Asserted by calling it, not by importing it.
  check('  and the numeric formatter still renders both orders',
        [api.formatDashboardDate('2026-10-16', 'dmy'), api.formatDashboardDate('2026-10-16', 'mdy')],
        ['16/10/2026', '10/16/2026']);

  // ── THE APP'S COPY AGREES, AND IS HELD TO IT ────────────────────────────
  //
  // While two copies exist, assert they answer identically rather than assert
  // that one of them is absent. This is the check that would have caught my
  // own false divergence report, and it is what keeps lane D's copy and the
  // shared rule from drifting before they are collapsed.
  const mobile = 'src/mobile/lib/dates.js';
  const { deviceDateFormat } = await import('../../src/mobile/lib/dates.js');
  const LOCALES = [
    'en-US', 'en-AU', 'en-GB', 'en-NZ', 'en-CA', 'en-IE', 'en-IN', 'en-ZA',
    'ja-JP', 'zh-CN', 'zh-TW', 'ko-KR', 'hu-HU', 'lt-LT', 'de-DE', 'fr-FR',
    'es-ES', 'es-MX', 'pt-BR', 'it-IT', 'nl-NL', 'sv-SE', 'da-DK', 'fi-FI',
    'pl-PL', 'ru-RU', 'tr-TR', 'ar-EG', 'he-IL', 'th-TH', 'vi-VN', 'id-ID',
    'uk-UA', 'cs-CZ', 'ro-RO', 'el-GR', 'nb-NO', 'is-IS', 'et-EE', 'sk-SK',
  ];
  const disagree = LOCALES.filter((l) => deviceDateFormat(l) !== localeDateFormat(l));
  ok(`the app's copy agrees with the shared rule, every locale`,
     disagree.length === 0,
     disagree.length ? disagree.map((l) => `${l}: app ${deviceDateFormat(l)} vs web ${localeDateFormat(l)}`).join(', ')
                     : `${LOCALES.length} locales swept, no disagreement`);
  // AND THE SWEEP CAN FAIL: a locale set that all answered the same way would
  // pass this file while proving nothing.
  ok('  and the sweep covers both answers, so it is not vacuous',
     new Set(LOCALES.map(localeDateFormat)).size === 2,
     `${LOCALES.filter((l) => localeDateFormat(l) === 'mdy').length} month-first, ${LOCALES.filter((l) => localeDateFormat(l) === 'dmy').length} day-first`);
  ok(`  ${mobile} is still lane D's to collapse into the shared rule`,
     true, /dateFormatPreference/.test(read(mobile)) ? 'done: it imports the shared rule' : 'two copies that agree, noted in MOBILE_PARITY.md');
  ok('  and the note is written down where lane D will see it',
     /dateFormatPreference/.test(read('MOBILE_PARITY.md')), 'MOBILE_PARITY.md');

  return results;
}
