/**
 * tests/persistence/dashboard-date-format.mjs
 *
 * NUMERIC DATES ON THE DASHBOARD, WRITTEN DATES EVERYWHERE A GUEST LOOKS.
 *
 * Item 5 of goals/2026-10-08-site-fixes-batch-1.md, which carries its own
 * boundary: the dashboard's dates become numeric in the account's chosen
 * format, and "guest-facing pages keep their written dates; this is dashboard
 * only".
 *
 * ── THE BOUNDARY IS THE HALF WORTH GUARDING ────────────────────────────────
 *
 * The formatter is pure and its edges are easy. What is not easy is keeping it
 * out of the places it must not reach, and I got that wrong once: I named
 * SendInvitesModal as a dashboard file, from a grep for toLocaleDateString
 * without tracing where each result went. Both of its dates are guest-facing.
 * One builds the WhatsApp message a guest receives; the other feeds
 * replaceMergeTags for the email PREVIEW, which has to match what
 * api/send-invites.js sends, and that formats the same tag as a written date.
 *
 * So this guard pins both directions: the four dashboard helpers route through
 * the formatter, and a named list of guest-facing files does not import it at
 * all. The second list is the one that matters, because the failure it catches
 * is invisible on the dashboard.
 *
 * ── AND THE CACHE IS NOT INCIDENTAL ────────────────────────────────────────
 *
 * Two of the four helpers are module-level and cannot call useAuth, so the
 * formatter reads the oi_user key that src/lib/AuthContext.jsx writes, and
 * Account.jsx mirrors the preference into that key as it saves. If the mirror
 * is ever dropped, the setting appears to save and no date changes until the
 * next full load, so the mirror is asserted here.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import {
  formatDashboardDate, normalizeDateFormat, accountDateFormat,
  dateFormatExample, DATE_FORMATS, DATE_FORMAT_LABELS, DEFAULT_DATE_FORMAT,
} from '../../src/lib/dashboardDate.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// Routed through the formatter.
const DASHBOARD = [
  'src/pages/EventDetails.jsx',
  'src/components/guests/GuestList.jsx',
  'src/pages/Admin.jsx',
  'src/components/shared/DatePicker.jsx',
  // 2026-10-09, found by lane B's camera: seven more surfaces #917 missed,
  // each still writing its own date. The first two were reported by name; the
  // rest came from sweeping the dashboard for any written-date formatter.
  'src/components/schedule/ScheduleTable.jsx',
  'src/components/budget/BudgetList.jsx',
  'src/Layout.jsx',
  'src/pages/Calendar.jsx',
  'src/pages/TodoList.jsx',
  'src/pages/Account.jsx',
  'src/pages/GuestExperience.jsx',
  'src/pages/Messages.jsx',
];

/**
 * EVERY WRITTEN-DATE SHAPE, NOT THE ONE #917 HAPPENED TO SEE.
 *
 * The old check looked for exactly `toLocaleDateString('en-AU', { day` and
 * nothing else, so it was blind to the two shapes lane B found: a locale of
 * `undefined` with a weekday, and a date-fns format string carrying MMM. A
 * check written as a list of the shapes its author had met is the mistake this
 * programme keeps paying for, so this is the whole family.
 *
 * MMM IS MATCHED ONLY INSIDE A FORMAT STRING, because a bare "MMM" could
 * appear in prose, and a TIME-ONLY format string is allowed: a message
 * timestamp still needs its "h:mm a", and the date beside it comes from the
 * one formatter.
 */
const WRITTEN_DATE_SHAPES = [
  [/toLocaleDateString\([^)]*month:\s*'(long|short)'/, "toLocaleDateString with a month name"],
  [/format(Stored)?\([^)]*'[^']*MMM[^']*(d|y)[^']*'/, "a date-fns format string with MMM and a day or year"],
];

// MUST NOT BE. Each one is a date a guest reads, or a preview of one.
const GUEST_FACING = [
  'src/components/guests/SendInvitesModal.jsx',
  'src/lib/emailTemplate.js',
  'src/components/rsvp/RSVPPage.jsx',
  'src/components/guest-website/pages/WeddingCelebrationPage.jsx',
  'src/components/guest-website/pages/WeddingMusicPage.jsx',
  'src/pages/GuestMusic.jsx',
];

export async function runDashboardDateFormat() {
  const results = [];
  const show = (v) => String(JSON.stringify(v)).slice(0, 60);
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want) ? pass(label, show(got)) : fail(label, show(want), show(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE FORMATTER ───────────────────────────────────────────────────────

  check('day/month/year', formatDashboardDate('2026-05-18', 'dmy'), '18/05/2026');
  check('month/day/year', formatDashboardDate('2026-05-18', 'mdy'), '05/18/2026');
  check('both are zero padded and four-digit', formatDashboardDate('2026-01-02', 'dmy'), '02/01/2026');
  check('an ISO timestamp works too', formatDashboardDate('2026-05-18T13:45:00Z', 'dmy').length, 10);
  // A DATE-ONLY STRING IS LOCAL MIDNIGHT, not UTC. Read as UTC it renders the
  // day before for every account west of Greenwich, which is why EventDetails
  // was appending T00:00:00 by hand before this existed.
  //
  // UNDER A FORCED WESTERN TIMEZONE, because otherwise this check cannot fail.
  // This machine is UTC+11 and CI runs in UTC; in both, a bare
  // new Date('2026-05-18') still reports the 18th, so the assertion passed with
  // the bug deliberately reintroduced. Forcing America/Los_Angeles is the
  // difference between a check and a decoration: 18 correct, 17 broken.
  {
    const priorTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    const west = formatDashboardDate('2026-05-18', 'dmy');
    if (priorTz === undefined) delete process.env.TZ; else process.env.TZ = priorTz;
    check('a date-only string is not shifted a day west of Greenwich', west, '18/05/2026');
  }
  // EVERY FAILURE PATH IS THE DEFAULT, never an empty cell with no date.
  check('an unknown format falls back to the default',
        formatDashboardDate('2026-05-18', 'nonsense'), formatDashboardDate('2026-05-18', DEFAULT_DATE_FORMAT));
  check('  and the default is day/month/year', DEFAULT_DATE_FORMAT, 'dmy');
  check('normalize rejects anything else', [normalizeDateFormat('mdy'), normalizeDateFormat(''), normalizeDateFormat(undefined), normalizeDateFormat('DMY')],
        ['mdy', 'dmy', 'dmy', 'dmy']);
  // NO DATE IS NOT A DATE: these render nothing rather than "Invalid Date".
  check('nothing in, nothing out',
        [formatDashboardDate(''), formatDashboardDate(null), formatDashboardDate(undefined), formatDashboardDate('not a date')],
        ['', '', '', '']);
  check('the two choices are the schema enum', DATE_FORMATS, ['dmy', 'mdy']);
  check('  each with a label and a worked example',
        DATE_FORMATS.map((f) => `${DATE_FORMAT_LABELS[f]} ${dateFormatExample(f)}`),
        ['Day/month/year 18/05/2026', 'Month/day/year 05/18/2026']);
  // IN NODE THERE IS NO localStorage: the reader must answer, not throw.
  ok('reading the preference outside a browser does not throw',
     accountDateFormat() === DEFAULT_DATE_FORMAT, 'falls back');

  // ── THE FOUR DASHBOARD HELPERS ──────────────────────────────────────────

  for (const f of DASHBOARD) {
    const src = code(read(f));
    ok(`${f.split('/').pop()} formats through the one formatter`,
       /formatDashboardDate\(/.test(src), 'routed');
    const offenders = WRITTEN_DATE_SHAPES.filter(([re]) => re.test(src)).map(([, label]) => label);
    ok(`  and no longer writes its own written date, in any shape`,
       offenders.length === 0, offenders.join(' · ') || 'none of the known shapes');
  }

  // ── THE TWO LANE B NAMED, PINNED POSITIVELY ─────────────────────────────
  //
  // Absence checks alone would pass on a surface that stopped rendering a date
  // at all, so each of these says what it now calls.
  const sched = code(read('src/components/schedule/ScheduleTable.jsx'));
  ok('the schedule table formats every row through the one formatter',
     /formatDashboardDate\(/.test(sched), 'routed');
  ok('  and no longer prints a weekday in front of it',
     !/weekday:/.test(sched), 'weekday gone');
  const budget = code(read('src/components/budget/BudgetList.jsx'));
  ok('the budget expenses tab formats payment dates through it too',
     /formatDashboardDate\(item\.payment_date\)/.test(budget), 'payment_date routed');
  ok('  and no longer calls formatStored for a date',
     !/formatStored\(item\.payment_date/.test(budget), 'no formatStored date');
  // A MESSAGE KEEPS ITS TIME. The date is the only part that moves, so the
  // time format has to survive, and it is asserted rather than assumed.
  const msgs = code(read('src/pages/Messages.jsx'));
  ok('a message timestamp keeps its time beside the account-format date',
     /formatDashboardDate\(message\.created_date\)/.test(msgs)
       && /formatStored\(message\.created_date, 'h:mm a'\)/.test(msgs),
     'date + time');

  // ── AND THE PLACES IT MUST NOT REACH ────────────────────────────────────

  for (const f of GUEST_FACING) {
    const src = read(f);
    ok(`${f.split('/').pop()} does NOT import the dashboard formatter`,
       !/dashboardDate/.test(src), 'guest-facing, written dates kept');
  }
  // THE PREVIEW HAS TO MATCH THE SEND, which is why SendInvitesModal is on
  // that list: api/send-invites.js formats the same merge tag as a written
  // date, and a numeric preview would misdescribe the email.
  ok('the server still writes the wedding date in words',
     /toLocaleDateString\('en-AU', \{ weekday/.test(read('api/send-invites.js')), 'unchanged');

  // ── THE SETTINGS CONTROL AND ITS CACHE MIRROR ───────────────────────────

  const account = code(read('src/pages/Account.jsx'));
  ok('Settings offers the choice', /DateFormatToggle/.test(account) && /Date format/.test(account), 'present');
  ok('  saved through the same updateMe path as the temperature unit',
     /base44\.auth\.updateMe\(\{ dateFormat: next \}\)/.test(account), 'updateMe');
  ok('  and mirrored into the oi_user cache the formatter reads',
     /localStorage\.setItem\('oi_user', JSON\.stringify\(\{ \.\.\.stored, dateFormat: next \}\)\)/.test(account),
     'mirrored');
  ok('  with the user refreshed afterwards', /refreshUser\?\.\(\)/.test(account), 'refreshUser');
  ok('  and both pills carry their format for a guard to find',
     /data-date-format=\{f\}/.test(account), 'data-date-format');
  // THE CACHE KEY IS AuthContext'S OWN, not a second source of truth.
  ok('the formatter reads the key AuthContext writes',
     /localStorage\.setItem\('oi_user'/.test(read('src/lib/AuthContext.jsx'))
     && /'oi_user'/.test(code(read('src/lib/dashboardDate.js'))), 'one cache');

  return results;
}
