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
  WRITTEN_DATE_LOCALES, WEDDING_DATE_PARTS, DEFAULT_WRITTEN_FORMAT,
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

  // ── ONE WRITTEN STYLE, IN THE COUPLE'S ORDER ────────────────────────────
  //
  // Owner ruling 2026-10-16(b). The two shapes ARE the ruling, so they are
  // asserted literally. 14 June 2027 is a MONDAY: the ruling's own example
  // said Saturday, which is why the real weekday is pinned here.
  check('mdy writes the US order', formatWeddingDateText('2027-06-14', 'mdy'), 'Monday, June 14, 2027');
  check('  and dmy writes the AU order', formatWeddingDateText('2027-06-14', 'dmy'), 'Monday 14 June 2027');
  check('  an absent format is dmy, never a guess',
        [formatWeddingDateText('2027-06-14'), formatWeddingDateText('2027-06-14', 'nonsense'), formatWeddingDateText('2027-06-14', null)],
        ['Monday 14 June 2027', 'Monday 14 June 2027', 'Monday 14 June 2027']);
  check('  and that default is named, not implied', DEFAULT_WRITTEN_FORMAT, 'dmy');
  check('  the two locales are the two shapes', WRITTEN_DATE_LOCALES, { mdy: 'en-US', dmy: 'en-AU' });
  check('  with weekday, month as a word, day and year', WEDDING_DATE_PARTS,
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── THE PREVIEW STRING EQUALS THE EMAIL STRING ──────────────────────────
  //
  // The owner asked for this one by name. Not a source grep: it renders the
  // REAL email through renderInvitationEmail, the same function the modal's
  // preview pane and api/send-invites.js both call, and looks for the written
  // date inside the HTML a guest would receive. If the merge tag and the email
  // body ever disagree, or either stops following the couple's order, this
  // fails with both strings in hand.
  const { renderInvitationEmail } = await import('../../src/lib/emailTemplate.js');
  const renderedDate = (dateFormat) => {
    const html = renderInvitationEmail({
      universeId: 'capri', type: 'invite', guestName: 'Sam', coupleNames: 'A & B',
      events: [{ name: 'Ceremony', date: '2027-06-14', venue: 'A venue' }],
      weddingDate: '2027-06-14', dateFormat, rsvpUrl: 'https://example.test/r',
      rsvpToken: 't', siteUrl: 'https://example.test', stopEmailsUrl: 'https://example.test/stop',
    }).html;
    return (html.match(/(Monday[^<·]*2027)/) || [])[1]?.trim() || '(not found in the email)';
  };
  for (const f of ['dmy', 'mdy']) {
    const preview = formatWeddingDateText('2027-06-14', f);
    const email = inZone('UTC', () => renderedDate(f));
    check(`the preview string equals the email string for ${f}`, email, preview);
  }

  // AND THE SERVER GOES THROUGH THE SHARED FORMATTER, so neither of the above
  // can be true of the helper while the send quietly does its own thing.
  const server = read(SERVER);
  ok('the server formats the merge tag with the shared helper',
     /formatWeddingDateText\(weddingDate, dateFormat\)/.test(code(server)), 'formatWeddingDateText');
  ok('  and no longer hardcodes a locale of its own',
     !/toLocaleDateString\('en-AU'/.test(code(server)), "no 'en-AU' literal left");
  ok('  reading the order the client resolved, defaulting to dmy',
     /wedding\.dateFormat\) \|\| DEFAULT_WRITTEN_FORMAT/.test(code(server)), 'from the payload');
  ok('  and passing it to the email template',
     /^\s*dateFormat,$/m.test(code(server)), 'threaded into renderInvitationEmail');
  // THE CLIENT SENDS WHAT IT RESOLVED, not the raw User field: the owner's
  // refinement. accountDateFormat() is User.dateFormat else the browser locale.
  const modalSrc = code(read(MODAL));
  ok('the client sends the order it actually resolved for the preview',
     /const resolvedDateFormat = accountDateFormat\(\)/.test(modalSrc), 'accountDateFormat()');
  ok('  in every send payload, not just one of them',
     (modalSrc.match(/dateFormat: resolvedDateFormat/g) || []).length >= 3,
     `${(modalSrc.match(/dateFormat: resolvedDateFormat/g) || []).length} use(s): the preview and both payloads`);
  // The email template must not keep a second written-date style.
  ok('the email template has no hardcoded written-date locale left',
     !/toLocaleDateString\('en-AU'/.test(code(read('src/lib/emailTemplate.js'))), 'one style');

  // ── THE MODAL GOES THROUGH THE HELPER ───────────────────────────────────
  const modal = code(read(MODAL));
  ok('the modal builds the merge tag with the helper',
     /const dateStr = formatWeddingDateText\(weddingDate, resolvedDateFormat\)/.test(modal), 'formatWeddingDateText');
  ok('  and imports it', /import \{ formatWeddingDateText \} from '@\/lib\/weddingDateText'/.test(modal), 'imported');
  ok('  and no longer formats the wedding date by hand',
     !/new Date\(weddingDate\)\.toLocaleDateString/.test(modal), 'no raw toLocaleDateString on weddingDate');
  // THE BOUNDARY STAYS. dashboard-date-format.mjs forbids the numeric
  // dashboard formatter here, because this date is guest-facing and written.
  // THE BOUNDARY STAYS, and this is why the order rule had to move out of
  // dashboardDate.js: the modal needs to ASK which order the couple reads
  // dates in, without importing the NUMERIC dashboard formatter that
  // dashboard-date-format.mjs forbids on guest-facing files.
  ok('  and still does not reach for the numeric dashboard formatter',
     !/dashboardDate/.test(read(MODAL)), 'guest-facing, written dates kept');
  ok('  it asks the shared order module instead',
     /from '@\/lib\/dateFormatPreference'/.test(read(MODAL)), 'dateFormatPreference');

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
