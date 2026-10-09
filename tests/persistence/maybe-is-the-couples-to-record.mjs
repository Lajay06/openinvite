/**
 * tests/persistence/maybe-is-the-couples-to-record.mjs
 *
 * MAYBE IS SOMETHING THE COUPLE WRITES DOWN, NEVER SOMETHING A GUEST SUBMITS.
 *
 * Item 1 of goals/2026-10-09-reply-lifecycle.md. This file REPLACES
 * maybe-leaves-the-editor.mjs, which guarded the opposite ruling and whose
 * premise the owner reversed on 2026-10-09 by widening the per-event enum.
 * The old file is not patched, because every one of its assertions was a
 * statement that Maybe records nothing, and that is no longer true.
 *
 * ── THE HISTORY, BECAUSE IT IS THE REASON FOR THE SHAPE ───────────────────
 *
 * 2026-10-07: Maybe was withdrawn from the couple's status editor. A guest's
 * status is derived from event_responses, the per-event enum was pending, yes,
 * no, and a flat 'maybe' mapped to a per-event 'pending'. So choosing Maybe
 * showed exactly what Pending showed: a control that looked like it recorded
 * something and recorded nothing.
 *
 * 2026-10-09: the owner widened the enum to pending, yes, no, maybe. The
 * mapping is one to one again, so the offer comes back.
 *
 * ── THE TWO HALVES, AND THE SECOND ONE IS WHERE THE DANGER WAS ────────────
 *
 * The first half is that Maybe records a maybe: the editor offers it, the
 * import keeps it, it derives an overall maybe, and every surface that counts
 * attending and declined gives it a bucket of its own.
 *
 * The second half is that A GUEST CANNOT PRODUCE ONE AND CANNOT DESTROY ONE.
 * api/rsvp-submit.js keeps VALID_STATUSES at pending, yes, no, by owner
 * ruling, so a crafted request cannot store a maybe. That same coercion is
 * what made the widening dangerous: both reply forms submit EVERY invited
 * event, not only the ones the guest touched, so a guest opening their link
 * after the couple recorded a maybe would have sent that maybe back, had it
 * coerced to pending, and silently erased it. Both forms now seed a stored
 * maybe as unanswered, which is asserted here, twice, because the two forms
 * reach the server by different routes.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { deriveRsvpStatus } from '../../src/lib/rsvpAggregation.js';
import { applyStatusToEventResponses, isRecordableStatus } from '../../src/lib/statusWrite.js';
import { rowToGuest } from '../../src/lib/guestImport.js';
import { tallyEventsForGuests } from '../../src/lib/eventTallies.js';
import { repliesForEvent } from '../../src/lib/eventDeletion.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

const EVENTS = [
  { event_id: 'main-ceremony', name: 'Ceremony', isMain: true },
  { event_id: 'reception', name: 'Reception', isMain: true },
];
const invitedTo = (statuses) => EVENTS.map((ev, i) => ({
  event_id: ev.event_id, invited: true, status: statuses[i],
}));

export async function runMaybeIsTheCouplesToRecord() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const eq = (label, got, want) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    results.push(a === b ? pass(label, a) : fail(label, b, a));
  };

  // ── 1. THE COUPLE'S EDITOR OFFERS IT; THE GUEST'S FORM DOES NOT ─────────

  const form = code('src/components/guests/GuestForm.jsx');
  const offered = [...form.matchAll(/<SelectItem value="(pending|attending|declined|maybe)">([^<]+)</g)]
    .map((m) => [m[1], m[2]]);
  eq('the couple\'s status editor offers all four states',
     offered.map(([v]) => v).sort(), ['attending', 'declined', 'maybe', 'pending']);
  ok('  and Maybe is spelled as a word, not a code',
     offered.some(([v, label]) => v === 'maybe' && label.trim() === 'Maybe'),
     offered.find(([v]) => v === 'maybe')?.[1]);

  // THE GUEST IS NEVER OFFERED IT. Asserted on the reply form's own markup,
  // because this is the half of the ruling a later edit is most likely to
  // break by "making the forms consistent".
  const reply = code('src/components/rsvp/RSVPPage.jsx');
  ok('the guest reply form offers no maybe option', !/value="maybe"/.test(reply), 'no maybe option');
  ok('  and the server refuses one even if it is crafted',
     /VALID_STATUSES\s*=\s*new Set\(\['yes',\s*'no',\s*'pending'\]\)/.test(code('api/rsvp-submit.js')),
     "VALID_STATUSES stays yes, no, pending");

  // ── 2. A RECORDED MAYBE IS A MAYBE ROW ──────────────────────────────────

  ok('a flat maybe is still a status the write knows', isRecordableStatus('maybe'), 'recordable');
  const written = applyStatusToEventResponses({
    events: EVENTS, guest: { event_responses: invitedTo(['pending', 'pending']) },
    status: 'maybe', now: '2026-10-09T00:00:00.000Z',
  });
  eq('  and it writes maybe rows, not pending rows', written.map((r) => r.status), ['maybe', 'maybe']);
  eq('  each carrying the moment it was recorded',
     written.map((r) => r.responded_at),
     ['2026-10-09T00:00:00.000Z', '2026-10-09T00:00:00.000Z']);

  // ── 3. THE DERIVATION, INCLUDING THE TWO WAYS IT COULD GO WRONG ─────────
  //
  // Owner ruling 2026-10-09: any invited event at maybe with no yes derives
  // maybe; yes wins over maybe; all no stays declined. Written as a table so
  // the precedence is readable rather than inferred from three separate cases.
  const DERIVE = [
    [['maybe', 'maybe'], 'maybe', 'unsure about everything'],
    [['maybe', 'pending'], 'maybe', 'one maybe, one unanswered'],
    [['maybe', 'no'], 'maybe', 'a maybe and a no is still a maybe'],
    [['yes', 'maybe'], 'attending', 'yes wins over maybe'],
    [['maybe', 'yes'], 'attending', 'and it wins in either order'],
    [['no', 'no'], 'declined', 'all no stays declined'],
    [['pending', 'pending'], 'pending', 'silence is still pending'],
    [['yes', 'no'], 'attending', 'unchanged by this item'],
  ];
  for (const [statuses, want, why] of DERIVE) {
    const got = deriveRsvpStatus(invitedTo(statuses));
    results.push(got === want
      ? pass(`derive: ${why}`, `${statuses.join('+')} -> ${got}`)
      : fail(`derive: ${why}`, want, got));
  }
  // An uninvited maybe is not the guest's answer to anything.
  ok('a maybe on an event the guest is not invited to is ignored',
     deriveRsvpStatus([{ event_id: 'x', invited: false, status: 'maybe' }]) === 'pending',
     'pending');

  // ── 4. ITS OWN BUCKET, AND NOWHERE ELSE ─────────────────────────────────
  //
  // The goal's wording: a maybe row counts in the Maybe bucket and nowhere
  // else. Asserted on the real tally rather than on the page, so it holds for
  // every surface reading it.
  const guests = [
    { id: 'a', name: 'A', event_responses: invitedTo(['yes', 'yes']) },
    { id: 'b', name: 'B', event_responses: invitedTo(['no', 'no']) },
    { id: 'c', name: 'C', event_responses: invitedTo(['maybe', 'maybe']) },
    { id: 'd', name: 'D', event_responses: invitedTo(['pending', 'pending']) },
  ];
  const wedding = { mainCeremony: { name: 'Ceremony' }, reception: { name: 'Reception' } };
  let tallies = []; let crash = '';
  try { tallies = tallyEventsForGuests(wedding, guests); } catch (e) { tallies = []; crash = e.message; }
  const ceremony = tallies.find((t) => t.name === 'Ceremony') || tallies[0];
  if (ceremony) {
    eq('the ceremony tally gives maybe its own number',
       { yes: ceremony.yes, no: ceremony.no, maybe: ceremony.maybe }, { yes: 1, no: 1, maybe: 1 });
    ok('  and replied counts it, because replied means answered',
       ceremony.replied === 3, `replied ${ceremony.replied} of ${ceremony.invited}`);
  } else {
    results.push(fail('the ceremony tally gives maybe its own number', 'a tally', crash || 'no tally resolved'));
  }

  // A maybe is an answer deleting the event would throw away, so the warning
  // that names those people has to name them.
  const replies = repliesForEvent(guests, 'main-ceremony');
  ok('deleting an event warns about the maybe guest too',
     replies.count === 3 && replies.names.includes('C'), `${replies.count}: ${replies.names.join(', ')}`);

  // ── 5. THE IMPORT KEEPS THE WORD ────────────────────────────────────────

  const imported = rowToGuest({ Name: 'Ada Lovelace', RSVP: 'maybe' }, 'AU', EVENTS);
  ok('a spreadsheet saying maybe imports as maybe', imported.rsvp_status === 'maybe', imported.rsvp_status);
  eq('  and produces maybe rows for the events they are invited to',
     (imported.event_responses || []).map((r) => r.status), ['maybe', 'maybe']);
  ok('  and nothing is flagged as remapped, because nothing was remapped',
     !('_maybeMapped' in imported), 'no _maybeMapped');
  ok('  the import summary no longer carries the mapping line',
     !/Maybe is recorded as awaiting/.test(read('src/components/guests/ImportGuestModal.jsx')),
     'line gone');
  // The round trip the goal asks for: the word in, the word out.
  ok('the word round-trips, in as maybe and out as maybe',
     rowToGuest({ Name: 'B', RSVP: 'MAYBE' }, 'AU', EVENTS).rsvp_status === 'maybe', 'case-insensitive');

  // ── 6. A GUEST CANNOT DESTROY THE COUPLE'S MAYBE ────────────────────────
  //
  // The data-loss case, and the reason this section exists at all. Both reply
  // forms seed from a stored status, and both submit every invited event, so a
  // seeded 'maybe' would be sent back and coerced to pending by the server.
  ok('the guest reply form seeds a stored maybe as unanswered',
     /status:\s*\(r\.status === 'pending' \|\| r\.status === 'maybe'\) \? '' : r\.status/.test(reply),
     "pending and maybe both seed ''");
  ok('  and the household form does the same',
     /status:\s*\(r\.status === 'pending' \|\| r\.status === 'maybe'\) \? '' : r\.status/
       .test(code('src/lib/householdRsvp.js')),
     "pending and maybe both seed ''");
  ok('  so the submit cannot proceed until the guest answers',
     /allEventsAnswered\s*=\s*invitedEvents\.length > 0 &&/.test(reply)
       && /if \(!allEventsAnswered \|\| !householdComplete\) return;/.test(reply),
     'gated on every event answered');

  // ── 7. SEATING AND AVA TREAT IT AS NOT YET ATTENDING ────────────────────

  const seating = code('src/pages/Seating.jsx');
  ok('seating keeps a maybe guest on the chart',
     /response\.status === 'maybe'/.test(seating), 'seatable');
  ok('  but the attending-only filter still means yes alone',
     /!attendingOnly \|\| response\.status === 'yes'/.test(seating), "yes only");

  // ── 8. THE SURFACES THAT SHOW BUCKETS SHOW FOUR ─────────────────────────

  const list = code('src/components/guests/GuestList.jsx');
  ok('the guest row labels a maybe as Maybe, not as Pending',
     /maybe: 'Maybe'/.test(list), 'STATUS_LABELS');
  ok('  the per-event chip reads maybe',
     /response\.status === 'maybe'/.test(list), 'chip');
  ok('  and the status column can sort it',
     /STATUS_SORT_RANK = \{ attending: 0, maybe: 1, pending: 2, declined: 3 \}/.test(list), 'ranked');
  ok('  with an unknown status still sorting where pending sorts',
     /UNKNOWN_STATUS_RANK = STATUS_SORT_RANK\.pending/.test(list)
       && /\?\? UNKNOWN_STATUS_RANK/.test(list),
     'not a bare 1');
  ok('the Guests page counts maybe separately from pending',
     /else if \(r\.status === 'maybe'\) maybe\+\+/.test(code('src/pages/Guests.jsx')), 'own bucket');
  ok('  and counts it as replied',
     /r\.status === 'yes' \|\| r\.status === 'no' \|\| r\.status === 'maybe'\) replied\+\+/
       .test(code('src/pages/Guests.jsx')), 'replied means answered');
  ok('the dashboard chart already labels a Maybe bucket',
     /maybe: 'Maybe'/.test(code('src/components/dashboard/RSVPChart.jsx')), 'labelled');

  return results;
}
