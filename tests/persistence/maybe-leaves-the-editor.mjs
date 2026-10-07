/**
 * tests/persistence/maybe-leaves-the-editor.mjs
 *
 * THE STATUS EDITOR OFFERS WHAT IT CAN RECORD, AND NOTHING ELSE.
 *
 * Advisor ruling 2026-10-07, second pass, after item 2 of
 * goals/2026-10-07-rsvp-status-source.md reported the gap.
 *
 * The status is derived from event_responses now, and the per-event `status`
 * enum is pending, yes, no (base44/entities/Guest.jsonc). "Maybe" had no
 * per-event equivalent, so it mapped to pending and a couple choosing it saw
 * exactly what Pending shows: a control that looked like it recorded something
 * and recorded nothing. The offer is withdrawn rather than the enum widened,
 * because widening it is a schema change.
 *
 * A FILE CAN STILL SAY IT, so the import maps the word to awaiting AND SAYS
 * SO. Mapping somebody's data quietly is the part that would be wrong,
 * whatever the mapping, so the summary line is asserted here beside the
 * mapping itself.
 *
 * NO EXISTING RECORD IS REWRITTEN. The flat column's enum keeps 'maybe' and a
 * guest whose stored column says it is left alone: nothing reads that column
 * for display, so the value is inert where it sits, and a sweep would edit
 * records nobody asked us to touch. Asserted, so a later "tidy-up" has to
 * argue with a failing check.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { rowToGuest } from '../../src/lib/guestImport.js';
import { getWeddingEvents } from '../../src/lib/weddingEvents.js';
import { applyStatusToEventResponses, isRecordableStatus } from '../../src/lib/statusWrite.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[^\n]*?\/\/.*$/gm, (l) => l.slice(0, l.indexOf('//')));

const EVENTS = getWeddingEvents({ mainCeremony: { startTime: '14:00' }, reception: { startTime: '18:00' } });
const SUMMARY_LINE = 'Maybe is recorded as awaiting for now';

export async function runMaybeLeavesTheEditor() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE EDITOR OFFERS EXACTLY THREE ─────────────────────────────────────
  //
  // Read out of the status Select by its own markup rather than counting
  // SelectItems in the file, which would also pick up the category list four
  // lines above it.
  const form = read('src/components/guests/GuestForm.jsx');
  const block = /RSVP status<\/Label>[\s\S]*?<\/Select>/.exec(form)?.[0] || '';
  const offered = [...block.matchAll(/<SelectItem value="([a-z_]+)">([^<]+)<\/SelectItem>/g)]
    .map((m) => [m[1], m[2]]);

  check('the status control offers exactly Attending, Declined and Pending',
        offered.map(([, label]) => label).sort(), ['Attending', 'Declined', 'Pending']);
  check('  and their stored values are the three the enum shares with the editor',
        offered.map(([v]) => v).sort(), ['attending', 'declined', 'pending']);
  ok('  Maybe is not among them', !offered.some(([v]) => v === 'maybe'), 'withdrawn');
  ok('  and it is gone from the markup, not merely relabelled',
     !/value="maybe"/.test(stripComments(form)), 'no maybe option');

  // ── NO SCHEMA CHANGE, AND NO SWEEP ──────────────────────────────────────

  const guestSchema = JSON.parse(read('base44/entities/Guest.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  check('the flat column keeps maybe in its enum, because this is not a schema change',
        guestSchema.properties.rsvp_status.enum, ['pending', 'attending', 'declined', 'maybe']);
  check('  and the per-event enum is untouched',
        guestSchema.properties.event_responses.items.properties.status.enum, ['pending', 'yes', 'no']);

  // A stored 'maybe' is still something the write can be handed, and it still
  // maps to pending rather than throwing or being ignored. That is what makes
  // leaving old records alone safe.
  ok('a stored maybe is still recordable, so an old record is not a crash',
     isRecordableStatus('maybe'), 'maps to pending');
  check('  and it writes pending rows, not maybe rows',
        applyStatusToEventResponses({ events: EVENTS, guest: { event_responses: [] },
                                      status: 'maybe', now: null })
          .map((r) => r.status),
        ['pending', 'pending']);

  // ── THE IMPORT MAPS IT, AND SAYS SO ─────────────────────────────────────

  const imported = rowToGuest({ Name: 'Ada Lovelace', RSVP: 'maybe' }, 'AU', EVENTS);
  check('an imported maybe stores pending on the flat column too',
        imported.rsvp_status, 'pending');
  check('  and produces pending rows for the events they are invited to',
        (imported.event_responses || []).map((r) => [r.event_id, r.invited, r.status]),
        [['main-ceremony', true, 'pending'], ['reception', true, 'pending']]);
  ok('  and flags the row so the couple can be told', imported._maybeMapped === true, '_maybeMapped');

  check('a mixed-case or padded value maps the same way',
        rowToGuest({ Name: 'A', RSVP: ' MAYBE ' }, 'AU', EVENTS)._maybeMapped, true);

  for (const v of ['attending', 'declined', 'pending', '', 'probably']) {
    const g = rowToGuest({ Name: 'A', RSVP: v }, 'AU', EVENTS);
    results.push(g._maybeMapped === undefined
      ? pass(`  "${v}" is not flagged as mapped`, 'unflagged')
      : fail(`  "${v}" is not flagged as mapped`, 'unflagged', 'flagged'));
  }

  const modal = read('src/components/guests/ImportGuestModal.jsx');
  ok(`the summary carries "${SUMMARY_LINE}" verbatim`,
     modal.includes(`'${SUMMARY_LINE}'`), 'the owner\'s words');
  ok('  only when a row was actually mapped',
     /const maybeRows = toImport\.filter\(\(r\) => r\._maybeMapped\)\.length;/.test(modal)
     && /maybeRows > 0 \?/.test(modal), 'conditional on the count');
  // RE-POINTED 2026-10-07, households and children item 6. The clean-path
  // toast was the importedCount template and is now joined from a list,
  // because item 6 added a second line to it ("{n} guests in {m}
  // invitations, {c} children"). The property is unchanged: the maybe line
  // reaches BOTH the clean path and the troubled one.
  ok('  on the clean path as well as the troubled one',
     /\[shapeLine, maybeLine\]\.filter\(Boolean\)\.join/.test(modal)
     && /if \(maybeLine\) parts\.push\(maybeLine\);/.test(modal), 'both branches');
  ok('  and the flag is stripped before the guest is created',
  // RE-POINTED the same day and for the same reason: item 6 added
  // _householdLabel to the same destructure. Asserted by MEMBERSHIP now
  // rather than by the exact line, so the next preview field added does not
  // read as a regression in this one.
     /const \{[^}]*_maybeMapped[^}]*\.\.\.guestData \} = row;/.test(modal),
     'preview state, not guest data');

  return results;
}
