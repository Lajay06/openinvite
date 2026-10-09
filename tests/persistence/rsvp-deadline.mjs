/**
 * tests/persistence/rsvp-deadline.mjs
 *
 * A FORM THAT ONLY LOOKS CLOSED IS NOT CLOSED.
 *
 * Item 2 of goals/2026-10-09-reply-lifecycle.md. The couple sets a reply-by
 * date, the guest site stops offering the two buttons at the end of it, and
 * api/rsvp-submit.js refuses a status write with the same sentence the guest
 * was shown. Clearing the date reopens everything.
 *
 * ── THE BUG THAT WAS ALREADY THERE, AND IS THE REASON FOR THE PARSER ──────
 *
 * The field existed and the guest site read it in NINE places, every one of
 * them `new Date(value).toLocaleDateString()`. A bare YYYY-MM-DD parses as UTC
 * MIDNIGHT, and toLocaleDateString renders in the viewer's own zone, so a
 * 2027-05-01 deadline printed 4/30/2027 to a guest in Los Angeles: a day
 * earlier than the couple typed. Nothing had ever written the field, so nobody
 * had seen it; storing a date for the first time would have shipped it.
 *
 * That case is asserted here explicitly, with the process timezone forced,
 * because it is the one failure a reader cannot see by reading.
 *
 * ── AND THE ONE THE WIDENING COULD HAVE CAUSED ────────────────────────────
 *
 * The server refusal and the screen's copy come from ONE module. A refusal
 * worded differently from the screen that caused it reads like a bug, and a
 * client-only check is not a rule. Both halves are pinned below.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import {
  normalizeDeadline, deadlineDate, formatDeadline, deadlineHasPassed,
  CLOSED_HEADING, closedBody,
} from '../../src/lib/rsvpDeadline.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

const RSVP_PAGE = 'src/components/guest-website/pages/WeddingRSVPPage.jsx';
const FORM = 'src/components/rsvp/RSVPPage.jsx';
const SUBMIT = 'api/rsvp-submit.js';
const GUESTS = 'src/pages/Guests.jsx';

export async function runRsvpDeadline() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const eq = (label, got, want) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    results.push(a === b ? pass(label, a) : fail(label, b, a));
  };

  // ── 1. THE LOS ANGELES CASE, ASSERTED OUTRIGHT ──────────────────────────
  //
  // The owner asked for this one by name: a 2027-05-01 deadline must read as
  // 1 May 2027 in a Los Angeles browser. Checked on the date PARTS rather than
  // a locale string, so it holds whatever format the viewer's locale picks,
  // and on the en-US string too because that is what a reader recognizes.
  const la = deadlineDate('2027-05-01');
  eq('a 2027-05-01 deadline is 1 May 2027, not 30 April',
     [la.getFullYear(), la.getMonth() + 1, la.getDate()], [2027, 5, 1]);
  ok('  and it renders as 5/1/2027 in en-US', formatDeadline('2027-05-01', 'en-US') === '5/1/2027',
     formatDeadline('2027-05-01', 'en-US'));
  ok('  and as 1/05/2027 in en-AU', formatDeadline('2027-05-01', 'en-AU') === '01/05/2027',
     formatDeadline('2027-05-01', 'en-AU'));

  // THE OLD WAY STILL FAILS, which is what makes the fix above meaningful
  // rather than decorative. Asserted so nobody can "simplify" the parser back.
  const naive = new Date('2027-05-01').toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
  ok('  the old expression really did print the day before in Los Angeles',
     naive === '4/30/2027', `new Date('2027-05-01') -> ${naive}`);

  // ── 2. NO READER IS LEFT ON THE OLD EXPRESSION ──────────────────────────
  const page = code(RSVP_PAGE);
  const viaHelper = (page.match(/formatDeadline\(content\.rsvpDeadline\)/g) || []).length;
  ok('every deadline reader on the guest site goes through the shared formatter',
     viaHelper === 9, `${viaHelper} of 9`);
  ok('  and none builds a Date from the raw value',
     !/new Date\(content\.rsvpDeadline\)/.test(page), 'no raw Date()');

  // ── 3. BOTH STORED SHAPES PARSE ─────────────────────────────────────────
  const SHAPES = [
    ['2027-05-01', '2027-05-01', 'a bare calendar date, the new format'],
    ['2027-05-01T00:00:00.000Z', '2027-05-01', 'a full ISO timestamp, the old shape'],
    ['  2027-05-01  ', '2027-05-01', 'padded'],
    ['', null, 'an empty string is no deadline'],
    [null, null, 'null is no deadline'],
    ['not a date', null, 'unreadable text is no deadline'],
    [20270501, null, 'a number is no deadline'],
  ];
  for (const [input, want, why] of SHAPES) {
    const got = normalizeDeadline(input);
    results.push(got === want
      ? pass(`normalize: ${why}`, JSON.stringify(got))
      : fail(`normalize: ${why}`, want, got));
  }

  // ── 4. END OF DAY, UTC, AND THE BOUNDARY IS EXACT ───────────────────────
  //
  // UTC is a stopgap: there is no wedding time zone field and no venue one
  // either, which src/lib/ics.js documents. Goal 6 adds the field. The
  // boundary is pinned to the second so a later change has to be deliberate.
  const CLOSES = [
    ['2027-05-01T00:00:00Z', false, 'the morning of the deadline'],
    ['2027-05-01T23:59:59Z', false, 'one second before the end of it'],
    ['2027-05-02T00:00:00Z', true, 'the instant it ends'],
    ['2027-06-01T00:00:00Z', true, 'a month later'],
    ['2027-04-01T00:00:00Z', false, 'a month early'],
  ];
  for (const [nowIso, want, why] of CLOSES) {
    const got = deadlineHasPassed('2027-05-01', new Date(nowIso));
    results.push(got === want
      ? pass(`closed: ${why}`, String(got))
      : fail(`closed: ${why}`, want, got));
  }
  ok('no deadline is always open', deadlineHasPassed(null, new Date('2099-01-01')) === false, 'open');
  ok('  and an unreadable one is open too, never closed by accident',
     deadlineHasPassed('not a date', new Date('2099-01-01')) === false, 'open');

  // ── 5. ONE SENTENCE, SHARED BY THE SCREEN AND THE SERVER ────────────────
  const body = closedBody('Alex & Sam', '2027-05-01', 'en-US');
  ok('the heading is the owner\'s words', CLOSED_HEADING === 'Replies have closed.', CLOSED_HEADING);
  ok('  and the body is too, verbatim',
     body === 'Alex & Sam needed final numbers by 5/1/2027, so this form is now closed. '
       + 'If your plans have changed, or you did not get the chance to reply, send them '
       + 'a note below and they will see it straight away.',
     body);
  ok('  with a fallback when the couple is unnamed',
     closedBody('', '2027-05-01', 'en-US').startsWith('The couple needed final numbers'), 'The couple');

  // ── 6. THE SERVER REFUSES, FROM THE SAME MODULE ─────────────────────────
  //
  // The named exception. Three separate things: that it imports the shared
  // module rather than reimplementing the rule, that it refuses, and that the
  // refusal happens BEFORE any write.
  const submit = code(SUBMIT);
  ok('the server imports the shared deadline module',
     /from '\.\.\/src\/lib\/rsvpDeadline\.js'/.test(submit), 'shared, not reimplemented');
  ok('  and refuses a submission once the date has passed',
     /if \(deadlineHasPassed\(wedding\?\.rsvpContent\?\.rsvpDeadline\)\)/.test(submit), 'refused');
  ok('  with the same sentence the screen shows',
     /error: closedBody\(coupleDisplayName\(wedding\)/.test(submit), 'closedBody');
  ok('  as a 409, because nothing about the request is malformed',
     /res\.status\(409\)/.test(submit), '409');
  // ORDER MATTERS MORE THAN THE REFUSAL ITSELF: a refusal after the first
  // write would leave a partial reply behind.
  const refusalAt = submit.indexOf('deadlineHasPassed');
  const firstWriteAt = submit.indexOf('createRsvpResponse(');
  ok('  and it refuses before the first row is written',
     refusalAt > 0 && firstWriteAt > 0 && refusalAt < firstWriteAt,
     `refusal at ${refusalAt}, first write at ${firstWriteAt}`);
  ok('the guest can still send a note, which is what the sentence promises',
     !/deadlineHasPassed/.test(code('api/guest-note-submit.js')), 'note endpoint untouched');
  // The owner's ruling from item 1 still holds: a guest cannot submit a maybe.
  ok('and VALID_STATUSES is still yes, no, pending',
     /VALID_STATUSES\s*=\s*new Set\(\['yes',\s*'no',\s*'pending'\]\)/.test(submit), 'unchanged');

  // ── 7. THE FORM STOPS OFFERING THE BUTTONS, AND KEEPS THE REPLY ─────────
  const form = code(FORM);
  ok('the reply form derives closed from the shared module',
     /deadlineHasPassed\(wedding\?\.rsvpContent\?\.rsvpDeadline\)/.test(form), 'repliesClosed');
  ok('  and renders the closed state instead of the form',
     /if \(repliesClosed\) \{/.test(form) && /\{CLOSED_HEADING\}/.test(form), 'early return');
  ok('  with the note form below it',
     /if \(repliesClosed\) \{[\s\S]*?<GuestNoteForm/.test(form), 'GuestNoteForm');
  ok('a guest who already replied keeps their reply and loses only the edit',
     /\{!repliesClosed && \([\s\S]*?Change my response/.test(form), 'button gated');
  ok('  and is told when replies closed',
     /Replies closed on \{formatDeadline/.test(form), 'closed-on line');

  // ── 8. THE COUPLE CAN SET IT, AND CLEARING REOPENS ──────────────────────
  const guests = code(GUESTS);
  ok('the Guests page has a reply-by editor',
     /data-rsvp-deadline/.test(guests) && /id="rsvp-deadline"/.test(guests), 'date input');
  ok('  storing a calendar date through the shared normalizer',
     /type="date"/.test(guests) && /normalizeDeadline\(next\)/.test(guests), 'YYYY-MM-DD');
  ok('  merging into rsvpContent rather than replacing it',
     /\.\.\.\(rsvpContent \|\| \{\}\), rsvpDeadline: value/.test(guests), 'merged');
  ok('  showing how many have not replied beside it',
     /\{stats\.awaiting\}/.test(guests) && /not replied/.test(guests), 'awaiting count');
  ok('  and offering a way to clear it, which reopens the form',
     /onClick=\{\(\) => saveDeadline\(''\)\}/.test(guests), 'Clear');
  ok('  hidden for a collaborator, who has no wedding of their own',
     /!isCollaborating && !loading && \(\s*<div\s*data-rsvp-deadline/.test(guests)
       || /!isCollaborating/.test(guests.slice(guests.indexOf('data-rsvp-deadline') - 400, guests.indexOf('data-rsvp-deadline'))),
     'gated');

  return results;
}
