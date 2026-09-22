/**
 * src/mobile/screens/guests/guestCounts.js
 *
 * THE ONE COUNTING FUNCTION for the guest numbers on the phone (goal 8,
 * item 3). One label set for every event filter, all events included:
 *
 *   Invited, Attending, Declined, Awaiting reply
 *
 * and one invariant, per event and for all events alike, that the unit test
 * (scripts/test-guest-counts.mjs) proves on the demo fixtures:
 *
 *   invited === attending + declined + awaiting
 *
 * WHERE THE LOGIC COMES FROM. The desktop has no exported function for
 * these numbers; they are computed inline in src/pages/Guests.jsx (`stats`
 * for all events, `eventStats` for one event). Both are replicated here,
 * not imported, and this file is the shared-extraction candidate: when the
 * desktop lifts them into src/lib, this file should import them and shrink
 * to the invariant.
 *
 *   One event (Guests.jsx `eventStats`): guest ROWS, through the same
 *   getGuestEventResponse() the status chips use. A row counts when the
 *   response says invited; yes is attending, no is declined, anything else
 *   is awaiting. Plus-ones are not counted per event on the desktop either
 *   (the reply carries them as a number on the primary's row).
 *
 *   All events (Guests.jsx `stats`): ATTENDEES, primaries and plus-ones,
 *   through resolveAttendees() and the same status predicates, so a named
 *   plus-one counts as their own head under Attending, Declined and
 *   Awaiting reply, with the "X guests, Y plus-ones" breakdown the desktop
 *   shows under each card. Two things differ from the desktop and both are
 *   what the invariant needs:
 *     - Invited is counted over attendees too (a plus-one is invited when
 *       their host was), where the desktop counts guest rows; and an
 *       attendee who has answered without an invitation on record (a guest
 *       marked attending by hand) is invited by that answer, so the answer
 *       is never orphaned outside the total.
 *     - A "maybe" is awaiting a reply: it is not a final answer, and the
 *       desktop's isPending() would leave it in no column at all.
 *
 * Deliberately relative imports, as src/lib/guestRsvpTally.js explains, so
 * plain Node can bundle and run this under the test.
 */
import { resolveAttendees } from '../../../lib/attendees.js';
import { isAttending, isDeclined } from '../../../lib/guestRsvpTally.js';
import { getGuestEventResponse } from '../../../lib/weddingEvents.js';

/** The four stats in their fixed order, keyed to the list filter each one opens. */
export const GUEST_STAT_LABELS = [
  { key: 'invited', label: 'Invited' },
  { key: 'attending', label: 'Attending' },
  { key: 'declined', label: 'Declined' },
  { key: 'awaiting', label: 'Awaiting reply' },
];

const empty = () => ({ invited: 0, attending: 0, declined: 0, awaiting: 0 });

/**
 * Count the guest list for one wedding event, or for all events when
 * `event` is null. Returns { invited, attending, declined, awaiting } plus,
 * for all events, a `plusOnes` breakdown with the same four keys and
 * `guests` with the primaries only, so a label can say "12 guests, 3
 * plus-ones".
 */
export function countGuests(guests = [], event = null) {
  const list = Array.isArray(guests) ? guests.filter((g) => g && g.id) : [];
  if (event) {
    const out = empty();
    for (const g of list) {
      const r = getGuestEventResponse(g, event);
      if (!r.invited) continue;
      out.invited++;
      if (r.status === 'yes') out.attending++;
      else if (r.status === 'no') out.declined++;
      else out.awaiting++;
    }
    return out;
  }
  const byId = new Map(list.map((g) => [g.id, g]));
  const out = empty();
  const plusOnes = empty();
  const primaries = empty();
  for (const a of resolveAttendees(list)) {
    const host = byId.get(a.isPlusOne ? a.hostGuestId : a.id);
    const answered = isAttending(a) || isDeclined(a);
    if (!host?.invite_sent_at && !answered) continue;
    const bucket = a.isPlusOne ? plusOnes : primaries;
    const col = isAttending(a) ? 'attending' : isDeclined(a) ? 'declined' : 'awaiting';
    out.invited++; out[col]++;
    bucket.invited++; bucket[col]++;
  }
  return { ...out, plusOnes, guests: primaries };
}

/** True when the four numbers add up; the test and the screen both ask. */
export function holdsInvariant(c) {
  return !!c && c.invited === c.attending + c.declined + c.awaiting;
}

/**
 * The list filter for a stat. With an event on, statuses come from that
 * event's response; without one, from the guest's own reply, as the list
 * filters always have (Guests.jsx's predicates: attending, declined,
 * awaiting = invited and not yet answered, invited = an invitation sent).
 */
export function guestMatchesStat(guest, key, event = null) {
  if (event) {
    const r = getGuestEventResponse(guest, event);
    if (!r.invited) return false;
    if (key === 'invited') return true;
    if (key === 'attending') return r.status === 'yes';
    if (key === 'declined') return r.status === 'no';
    if (key === 'awaiting') return r.status !== 'yes' && r.status !== 'no';
    return true;
  }
  const answered = isAttending(guest) || isDeclined(guest);
  const invited = !!guest.invite_sent_at || answered;
  if (key === 'invited') return invited;
  if (key === 'attending') return isAttending(guest);
  if (key === 'declined') return isDeclined(guest);
  if (key === 'awaiting') return invited && !answered;
  return true;
}
