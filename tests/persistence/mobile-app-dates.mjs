/**
 * tests/persistence/mobile-app-dates.mjs
 *
 * EVERY DATE THE APP WRITES FOLLOWS THE COUPLE'S DATE FORMAT, AND THE PHONE'S
 * WHEN THEY NEVER CHOSE ONE. The screenshot pass of 2026-10-16 read 16/10/2026
 * on a US phone: src/lib/dashboardDate.js FELL BACK to day/month/year when the
 * account had no dateFormat, and three screens hardcoded a locale of their own
 * ('en-AU' in SendInvitesScreen and offlineCache, 'en-US' in PlanContainer and
 * VendorsScreen). Past tense on the first of those since #1098, which taught
 * dashboardDate.js to ask the browser's locale as well; the app still reads
 * the raw preference itself, and the two halves below are unaffected.
 *
 * Two halves.
 *
 *   1. ONE DOOR. With comments stripped, no file in src/mobile other than
 *      src/mobile/lib/dates.js calls toLocaleDateString, toLocaleTimeString,
 *      Intl.DateTimeFormat or formatDashboardDate, passes date options to
 *      toLocaleString, or names 'en-AU' or 'en-GB'. A number's
 *      toLocaleString('en-US') is not a date and is left alone.
 *
 *   2. THE ORDER. dates.js is imported and run: the couple's "dmy" or "mdy"
 *      wins over the phone, no choice (or a value that is not one of the two)
 *      falls to the phone's order, a date-only string is the local day on a
 *      phone west of Greenwich, and the written form puts the month where the
 *      couple reads it.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = path.join(ROOT, 'src/mobile');
const DOOR = 'src/mobile/lib/dates.js';

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jsx?|tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const BANNED = [
  ['toLocaleDateString', /\.toLocaleDateString\(/],
  ['toLocaleTimeString', /\.toLocaleTimeString\(/],
  ['Intl.DateTimeFormat', /Intl\.DateTimeFormat/],
  ['formatDashboardDate', /\bformatDashboardDate\b/],
  ['toLocaleString with date options', /\.toLocaleString\([^)]*\b(dateStyle|timeStyle|month|weekday)\b/],
  ["'en-AU' or 'en-GB'", /['"`]en-(AU|GB)['"`]/],
];

/** Every banned call in a source string, as "name" entries. */
export function bannedDateCalls(src) {
  const code = stripComments(src, { line: true });
  return BANNED.filter(([, re]) => re.test(code)).map(([name]) => name);
}

export async function runMobileAppDates() {
  const results = [];
  const ok = (name, cond, note) => results.push(cond ? pass(name, note) : fail(name, 'true', note));

  // 1. One door.
  const offenders = [];
  for (const file of walk(SHELL)) {
    const rel = path.relative(ROOT, file);
    if (rel === DOOR) continue;
    const hits = bannedDateCalls(fs.readFileSync(file, 'utf8'));
    if (hits.length) offenders.push(`${rel}: ${hits.join(', ')}`);
  }
  ok('every date in src/mobile is written through src/mobile/lib/dates.js', offenders.length === 0, offenders.join('; ') || 'none outside it');

  const probe = [
    bannedDateCalls("new Date(x).toLocaleDateString('en-AU', { day: 'numeric' })").length,
    bannedDateCalls("d.toLocaleString('en-US', { dateStyle: 'medium' })").length,
    bannedDateCalls("import { formatDashboardDate } from '@/lib/dashboardDate';").length,
    bannedDateCalls("count.toLocaleString('en-US')").length,
    bannedDateCalls("// was toLocaleDateString('en-AU')\nconst a = 1;").length,
  ];
  ok('  and the sweep catches a hardcoded locale, not a number or a comment', probe.join(',') === '2,1,1,0,0', probe.join(','));

  // 2. The order. West of Greenwich, so a UTC reading of a date-only string would show the day before.
  // The CI runner imports every guard into one process, so the zone and the
  // storage stub are put back afterwards: a leaked TZ moved wedding-season.mjs's
  // December dates into November.
  const hadTZ = 'TZ' in process.env;
  const prevTZ = process.env.TZ;
  const prevStorage = globalThis.localStorage;
  process.env.TZ = 'America/Los_Angeles';
  let stored = null;
  globalThis.localStorage = { getItem: (k) => (k === 'oi_user' ? stored : null) };
  try {
    const m = await import(path.join(ROOT, DOOR));
    const as = (user, locale) => { stored = user === undefined ? null : JSON.stringify(user); return m.formatAppDate('2026-10-16', m.appDateFormat(locale)); };

    ok('no choice on a US phone reads 10/16/2026', as(undefined, 'en-US') === '10/16/2026', as(undefined, 'en-US'));
    ok('no choice on an Australian phone reads 16/10/2026', as(undefined, 'en-AU') === '16/10/2026', as(undefined, 'en-AU'));
    ok('the couple\'s "dmy" wins on a US phone', as({ dateFormat: 'dmy' }, 'en-US') === '16/10/2026', as({ dateFormat: 'dmy' }, 'en-US'));
    ok('the couple\'s "mdy" wins on an Australian phone', as({ dateFormat: 'mdy' }, 'en-AU') === '10/16/2026', as({ dateFormat: 'mdy' }, 'en-AU'));
    ok('a value that is not a choice falls to the phone', as({ dateFormat: 'ymd' }, 'en-US') === '10/16/2026', as({ dateFormat: 'ymd' }, 'en-US'));
    stored = '{not json';
    ok('an unreadable cache falls to the phone', m.formatAppDate('2026-10-16', m.appDateFormat('en-US')) === '10/16/2026');

    const w = [
      m.formatAppDateWritten('2026-10-16', { format: 'mdy' }),
      m.formatAppDateWritten('2026-10-16', { format: 'dmy' }),
      m.formatAppDateWritten('2026-10-16', { format: 'mdy', month: 'short' }),
    ];
    ok('the written date puts the month where the couple reads it', w.join(' | ') === 'October 16, 2026 | 16 October 2026 | Oct 16, 2026', w.join(' | '));
    ok('a time reads 3:05pm', m.formatAppTime(new Date(2026, 9, 16, 15, 5)) === '3:05pm', m.formatAppTime(new Date(2026, 9, 16, 15, 5)));
    ok('no date is the empty string', m.formatAppDate('', 'mdy') === '' && m.formatAppDateWritten(null) === '' && m.formatAppDateTime('nope') === '');
  } finally {
    if (hadTZ) process.env.TZ = prevTZ; else delete process.env.TZ;
    globalThis.localStorage = prevStorage;
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileAppDates();
  process.exit(r.every(Boolean) ? 0 : 1);
}
