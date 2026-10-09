/**
 * tests/persistence/status-writes-rows.mjs
 *
 * A STATUS THE COUPLE RECORDS BECOMES A PER-EVENT ANSWER, AND NOTHING ELSE.
 *
 * Item 2 of goals/2026-10-07-rsvp-status-source.md. Item 1 made the status
 * derived from event_responses everywhere, which left the guest editor and the
 * CSV import writing to a column nothing reads: a couple choosing "attending"
 * saw the guest go on reading awaiting. This is the other half.
 *
 * ── THE ONE THING THIS GUARD IS REALLY FOR ─────────────────────────────────
 *
 * A status write must NOT be an invitation write. An explicit invited:false is
 * a REMOVAL under the 2026-10-06 ruling, and a removal takes the event off the
 * couple's PUBLIC guest site. If this write used the full resolved set that
 * invitation writes use, marking one guest attending would stamp invited:false
 * on every custom event they are not invited to and the welcome drinks would
 * vanish from the public page. Measured, before the rule was written: three
 * public events became two.
 *
 * So publicEventIds is asserted on both sides of every write below. A guard
 * for this rule that checked only the entries would pass on the version that
 * silently unpublishes an event.
 *
 * The write is pure (src/lib/statusWrite.js) and `now` is injectable, so
 * everything here is driven rather than scanned, with four static checks for
 * the wiring at the two call sites.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { applyStatusToEventResponses, isRecordableStatus } from '../../src/lib/statusWrite.js';
import { getWeddingEvents } from '../../src/lib/weddingEvents.js';
import { publicEventIds } from '../../src/lib/guestEventVisibility.js';
import { deriveRsvpStatus } from '../../src/lib/rsvpAggregation.js';
import { rowToGuest } from '../../src/lib/guestImport.js';
import { tallyEventsForGuests } from '../../src/lib/eventTallies.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));
const readCode = (p) => stripComments(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const WEDDING = {
  weddingDate: '2027-06-12',
  mainCeremony: { startTime: '14:00', venueName: 'St Mary' },
  reception:    { startTime: '18:00', venueName: 'The Long Room' },
  preWeddingEvents: [{ event_id: 'wd', name: 'Welcome drinks', date: '2027-06-10' }],
};
const EVENTS = getWeddingEvents(WEDDING);
const NOW = '2027-01-01T00:00:00.000Z';
const ALL_PUBLIC = ['main-ceremony', 'reception', 'wd'];

const write = (guest, status) => applyStatusToEventResponses({ events: EVENTS, guest, status, now: NOW });
const shape = (rows) => rows.map((r) => [r.event_id, r.invited, r.status, r.responded_at]);

export async function runStatusWritesRows() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE GOAL'S OWN CASE: GRACE, NO ENTRIES, SET ATTENDING ───────────────

  const grace = { id: 'g1', name: 'Grace Hopper', rsvp_status: 'attending', event_responses: [] };
  const graceRows = write(grace, 'attending');

  check('a guest with no entries gets one per event they are invited to',
        shape(graceRows),
        [['main-ceremony', true, 'yes', NOW], ['reception', true, 'yes', NOW]]);

  check('  and NOT the welcome drinks, which she is not invited to',
        graceRows.some((r) => r.event_id === 'wd'), false);

  check('  so publicEventIds still returns all three',
        publicEventIds(WEDDING, [{ ...grace, event_responses: graceRows }]), ALL_PUBLIC);

  check('  the derived status now agrees with what the couple chose',
        deriveRsvpStatus(graceRows), 'attending');

  const tally = tallyEventsForGuests(WEDDING, [{ ...grace, event_responses: graceRows }]);
  check('  and the per-event counts count her as replied on both',
        tally.map((t) => [t.name, t.invited, t.replied]),
        [['Ceremony', 1, 1], ['Reception', 1, 1], ['Welcome drinks', 0, 0]]);

  // ── THE CASE THE RULING ADDED: AN EXISTING REMOVAL IS UNTOUCHED ─────────

  const removed = { id: 'g2', name: 'Bea', event_responses: [
    { event_id: 'wd', invited: false, status: 'pending', responded_at: null },
  ] };
  const beforePublic = publicEventIds(WEDDING, [removed]);
  const removedRows = write(removed, 'attending');

  check('an existing explicit invited:false comes through byte for byte',
        shape(removedRows.filter((r) => r.event_id === 'wd')),
        [['wd', false, 'pending', null]]);

  check('  and the public event set is exactly what it was before the write',
        publicEventIds(WEDDING, [{ ...removed, event_responses: removedRows }]), beforePublic);

  check('  which is two events, because that removal already existed',
        beforePublic, ['main-ceremony', 'reception']);

  check('  while the events she IS invited to got the answer',
        shape(removedRows.filter((r) => r.event_id !== 'wd')),
        [['main-ceremony', true, 'yes', NOW], ['reception', true, 'yes', NOW]]);

  // ── THE WRITE NEVER CREATES A REMOVAL ───────────────────────────────────
  //
  // The property, stated directly: for every status and every starting shape,
  // the set of events carrying invited:false is unchanged.
  const falseIds = (rows) => rows.filter((r) => r.invited === false).map((r) => r.event_id).sort();
  const starts = [
    ['no entries',            []],
    ['invited to everything', [{ event_id: 'wd', invited: true, status: 'pending' }]],
    ['one removal',           [{ event_id: 'wd', invited: false, status: 'pending' }]],
    ['two removals',          [{ event_id: 'wd', invited: false, status: 'pending' },
                               { event_id: 'reception', invited: false, status: 'pending' }]],
  ];
  for (const [label, existing] of starts) {
    for (const status of ['attending', 'declined', 'pending', 'maybe']) {
      const g = { id: 'x', event_responses: existing };
      const out = write(g, status);
      results.push(JSON.stringify(falseIds(out)) === JSON.stringify(falseIds(existing))
        ? pass(`${label} + ${status}: no removal created or destroyed`, JSON.stringify(falseIds(out)))
        : fail(`${label} + ${status}: no removal created or destroyed`,
               JSON.stringify(falseIds(existing)), JSON.stringify(falseIds(out))));
    }
  }

  // ── PENDING CLEARS THE TIMESTAMP ────────────────────────────────────────

  const answered = { id: 'g3', event_responses: [
    { event_id: 'main-ceremony', invited: true, status: 'yes', responded_at: NOW },
    { event_id: 'reception',     invited: true, status: 'yes', responded_at: NOW },
  ] };
  check('choosing pending clears the status and the timestamp',
        shape(write(answered, 'pending')),
        [['main-ceremony', true, 'pending', null], ['reception', true, 'pending', null]]);

  check('  and maybe does the same, because there is no per-event maybe',
        shape(write(answered, 'maybe')),
        [['main-ceremony', true, 'pending', null], ['reception', true, 'pending', null]]);

  check('declined writes no, with a timestamp',
        shape(write(answered, 'declined')),
        [['main-ceremony', true, 'no', NOW], ['reception', true, 'no', NOW]]);

  // ── A VALUE THIS MODULE DOES NOT KNOW WRITES NOTHING ────────────────────

  check('an unrecognised status leaves every entry alone',
        shape(write(answered, 'confirmed')), shape(answered.event_responses));
  ok('  and it is reported as unrecordable rather than guessed at',
     !isRecordableStatus('confirmed') && isRecordableStatus('attending'), 'four known values');

  // ── NO UNDECLARED KEY REACHES AN ENTRY ──────────────────────────────────
  //
  // Base44 drops undeclared keys silently, so a typo here would look like data
  // loss months later. The declared set is read from the entity mirror rather
  // than written out again.
  const guestSchema = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'base44/entities/Guest.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const declared = new Set(Object.keys(guestSchema.properties.event_responses.items.properties));
  const written = new Set();
  for (const [, existing] of starts) {
    for (const status of ['attending', 'pending']) {
      for (const r of write({ id: 'x', event_responses: existing }, status)) {
        Object.keys(r).forEach((k) => written.add(k));
      }
    }
  }
  check('every key this write puts on an entry is declared in the Guest mirror',
        [...written].filter((k) => !declared.has(k)), []);
  // maybe joined the enum on 2026-10-09. What this check is for is unchanged:
  // every status this write can produce has to be a value the schema accepts.
  // statusWrite still maps a flat maybe to a per-event pending until item 1 of
  // goals/2026-10-09-reply-lifecycle.md changes it, so no row says maybe yet.
  ok('  and the per-event status stays inside its enum',
     guestSchema.properties.event_responses.items.properties.status.enum.join(',') === 'pending,yes,no,maybe',
     'pending, yes, no, maybe');

  // ── THE IMPORT PATH ─────────────────────────────────────────────────────

  const imported = rowToGuest({ Name: 'Ada Lovelace', RSVP: 'attending' }, 'AU', EVENTS);
  check('a CSV row saying attending produces the same rows the editor would',
        (imported.event_responses || []).map((r) => [r.event_id, r.invited, r.status]),
        [['main-ceremony', true, 'yes'], ['reception', true, 'yes']]);
  check('  and it still carries the flat column, which writers may set',
        imported.rsvp_status, 'attending');
  check('  the public set is untouched by an import',
        publicEventIds(WEDDING, [imported]), ALL_PUBLIC);

  check('a blank RSVP column writes no entries, because it is not a choice',
        rowToGuest({ Name: 'Ada' }, 'AU', EVENTS).event_responses, undefined);
  check('  nor does an unreadable one',
        rowToGuest({ Name: 'Ada', RSVP: 'probably' }, 'AU', EVENTS).event_responses, undefined);
  check('  an explicit pending does write them, because that is a choice',
        (rowToGuest({ Name: 'Ada', RSVP: 'pending' }, 'AU', EVENTS).event_responses || [])
          .map((r) => [r.event_id, r.status]),
        [['main-ceremony', 'pending'], ['reception', 'pending']]);
  check('  and with no events supplied, nothing is invented',
        rowToGuest({ Name: 'Ada', RSVP: 'attending' }, 'AU').event_responses, undefined);

  // ── THE WIRING AT BOTH CALL SITES ───────────────────────────────────────

  const form = readCode('src/components/guests/GuestForm.jsx');
  ok('the editor applies the write on submit, not on every keystroke',
     /onSubmit\(\{[\s\S]{0,120}?event_responses: applyStatusToEventResponses\(\{/.test(form),
     'on the way out');
  ok('  and feeds it the guest it is editing, so existing entries survive',
     /guest: \{ \.\.\.guest, event_responses: guest\?\.event_responses \}/.test(form), 'existing passed in');
  ok('the import goes through the same module',
     /applyStatusToEventResponses\(\{ events, guest: \{ event_responses: \[\] \}, status: rsvpStatus \}\)/
       .test(readCode('src/lib/guestImport.js')), 'one write, two callers');

  // Neither caller may reach for the invitation write. This is the line that
  // would re-open the public-site hole, so it is asserted by absence.
  for (const file of ['src/components/guests/GuestForm.jsx', 'src/lib/guestImport.js']) {
    ok(`${path.basename(file)} does not use the invitation write`,
       !/resolveAllEventResponses/.test(readCode(file)), 'no full resolved set here');
  }

  // ── BOTH RULES ARE WRITTEN DOWN WHERE THE WRITE HAPPENS ─────────────────
  //
  // The goal asks for this explicitly: both rules in the header of the module
  // that performs the write, with the public-site reason.
  const mod = fs.readFileSync(path.join(ROOT, 'src/lib/statusWrite.js'), 'utf8');
  ok('the module header states the invitation rule', /FULL RESOLVED\s*\n?\s*\* SET|FULL RESOLVED SET/.test(mod), 'invitation writes');
  ok('  and the status rule', /A STATUS WRITE answers for the guest, and it is NARROW/.test(mod), 'status writes');
  ok('  and the public-site reason the narrow rule exists',
     /is a REMOVAL under the 2026-10-06 ruling/.test(mod) && /public/i.test(mod), 'the reason, not just the rule');
  ok('  and that "maybe" has no per-event equivalent',
     /"MAYBE" HAS NO PER-EVENT EQUIVALENT/.test(mod), 'reported, not decided');

  return results;
}
