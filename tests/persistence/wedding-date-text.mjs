/**
 * tests/persistence/wedding-date-text.mjs
 *
 * THE INVITATION PREVIEW SHOWS THE COUPLE'S OWN WEDDING DAY, IN EVERY ZONE,
 * AND SAYS WHAT THE EMAIL WILL SAY.
 *
 * Lane D's finding, launch fix 2, fixed 2026-10-16.
 * src/components/guests/SendInvitesModal.jsx built the [Wedding date] merge
 * tag with `new Date(weddingDate).toLocaleDateString('en-AU', { day, month,
 * year })`, which read a date-only string as UTC midnight. Every zone west of
 * Greenwich rendered the day BEFORE, so a couple in Los Angeles previewing an
 * 18 May wedding was shown 17 May. It also left the weekday out while
 * api/send-invites.js puts it in, so the preview misdescribed the email it was
 * previewing.
 *
 * ── THE TIME ZONE CHECKS ARE REAL, AND THAT WAS VERIFIED ───────────────────
 *
 * These set process.env.TZ in-process, which Node honors for Date formatting
 * afterwards: measured before writing them, America/Los_Angeles turned
 * "Monday 18 May 2026" into "Sunday 17 May 2026" and setting TZ back to UTC
 * restored it. A timezone check that does not actually change the zone passes
 * on any code at all, which is the failure mode this comment exists to rule
 * out. The control below asserts the OLD expression still shifts, so these
 * cannot all quietly become tautologies.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import {
  formatWeddingDateText, weddingCalendarDate,
  WEDDING_DATE_LOCALE, WEDDING_DATE_PARTS,
} from '../../src/lib/weddingDateText.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// stripComments from _shared.mjs, not a hand-written regex: the suite ratchets
// the number of hand-rolled strips down, and _shared's is the one that does not
// damage a file like src/App.jsx.
const code = (src) => stripComments(src);

const MODAL = 'src/components/guests/SendInvitesModal.jsx';
const SERVER = 'api/send-invites.js';

/** Run fn with TZ set, and put TZ back exactly as it was. */
function inZone(tz, fn) {
  const prior = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior;
  }
}

export async function runWeddingDateText() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, want, got));

  console.log('\n  The invitation preview writes the wedding day, not the day before:\n');

  // ── THE BUG, IN THE ZONES THAT HAD IT ───────────────────────────────────
  const WANT = 'Monday 18 May 2026';
  for (const tz of ['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Sao_Paulo']) {
    check(`an 18 May wedding reads 18 May in ${tz}`,
          inZone(tz, () => formatWeddingDateText('2026-05-18')), WANT);
  }
  // And nothing moved for the zones that were already right.
  for (const tz of ['UTC', 'Australia/Sydney', 'Europe/London', 'Pacific/Auckland']) {
    check(`  and still 18 May in ${tz}`,
          inZone(tz, () => formatWeddingDateText('2026-05-18')), WANT);
  }

  // ── THE CONTROL: THE OLD EXPRESSION REALLY DOES SHIFT ───────────────────
  //
  // If this ever stops failing, the timezone switching above has stopped
  // working and every check in this file has become a tautology.
  const oldWay = (v) => new Date(v).toLocaleDateString('en-AU', WEDDING_DATE_PARTS);
  check('CONTROL: the old expression still reads the day before in Los Angeles',
        inZone('America/Los_Angeles', () => oldWay('2026-05-18')), 'Sunday 17 May 2026');
  ok('  so the zone really is being changed, and these checks mean something',
     inZone('America/Los_Angeles', () => oldWay('2026-05-18')) !== inZone('UTC', () => oldWay('2026-05-18')),
     'the control differs by zone');

  // ── THE PREVIEW MATCHES THE SEND ────────────────────────────────────────
  //
  // Read off api/send-invites.js's own call rather than retyped here, so the
  // two cannot drift without this failing. That file is frozen by CLAUDE.md,
  // so this guard is the only thing holding the pair together today.
  const server = read(SERVER);
  ok('the server writes the wedding date in words, weekday included',
     /toLocaleDateString\('en-AU', \{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' \}\)/.test(server),
     'unchanged');
  check('  and the helper asks for exactly those parts', WEDDING_DATE_PARTS,
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  check('  in exactly that locale', WEDDING_DATE_LOCALE, 'en-AU');
  ok('  so the preview string equals what the send would produce',
     inZone('UTC', () => formatWeddingDateText('2026-05-18'))
       === inZone('UTC', () => new Date('2026-05-18').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })),
     'identical in the server\'s own zone');

  // ── THE MODAL GOES THROUGH THE HELPER ───────────────────────────────────
  const modal = code(read(MODAL));
  ok('the modal builds the merge tag with the helper',
     /const dateStr = formatWeddingDateText\(weddingDate\)/.test(modal), 'formatWeddingDateText');
  ok('  and imports it', /import \{ formatWeddingDateText \} from '@\/lib\/weddingDateText'/.test(modal), 'imported');
  ok('  and no longer formats the wedding date by hand',
     !/new Date\(weddingDate\)\.toLocaleDateString/.test(modal), 'no raw toLocaleDateString on weddingDate');
  // THE BOUNDARY STAYS. dashboard-date-format.mjs forbids the numeric
  // dashboard formatter here, because this date is guest-facing and written.
  ok('  and still does not reach for the numeric dashboard formatter',
     !/dashboardDate/.test(read(MODAL)), 'guest-facing, written dates kept');

  // ── NO DATE IS NOT A DATE ───────────────────────────────────────────────
  check('nothing in, nothing out',
        ['', null, undefined, 'not a date'].map(formatWeddingDateText), ['', '', '', '']);
  ok('  and the calendar reader says null rather than an Invalid Date',
     weddingCalendarDate('not a date') === null && weddingCalendarDate('') === null, 'null');

  // A full timestamp is an instant and is left as one.
  ok('a full ISO timestamp still formats',
     inZone('UTC', () => formatWeddingDateText('2026-05-18T13:45:00Z')) === WANT, WANT);
  ok('  and a Date goes through unchanged',
     inZone('UTC', () => formatWeddingDateText(new Date('2026-05-18T12:00:00Z'))) === WANT, WANT);

  return results;
}
