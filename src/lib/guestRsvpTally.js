/**
 * src/lib/guestRsvpTally.js
 *
 * AUDIT_2026-07.md S21: the single source of truth for tallying/filtering
 * Guest.rsvp_status — replaces 8 ad-hoc reimplementations that had already
 * drifted (avaContext.js and DailyUpdate.jsx checked for a 'confirmed'
 * value that does not exist in the schema and can never match; Dashboard.jsx
 * counted "responded" as rsvp_status !== 'pending', which silently counts
 * an unset/undefined status as responded, unlike every other file's
 * !status || status === 'pending' convention).
 *
 * Canonical status values, per the live Guest entity schema's own enum:
 *   ['pending', 'attending', 'declined', 'maybe']
 * 'confirmed' is NOT a valid value. Any code checking rsvp_status ===
 * 'confirmed' is a bug — it can never match, per this app's own schema.
 *
 * Do NOT confuse this with src/lib/rsvpAggregation.js, which aggregates
 * RsvpResponse rows / Guest.event_responses (the intentional, separate
 * per-event yes/no/pending model — untouched by this file).
 *
 * Plus-ones: resolved through src/lib/plusOne.js (derived
 * plus_one_rsvp_status first, flat Guest.plus_one_rsvp as fallback), and
 * gated on the plus-one existing rather than on them having an email.
 * tallyGuestRsvp only folds a plus-one in as their
 * own attendee when explicitly asked (includePlusOnes: true) — Guests.jsx
 * is the one call site that already did this correctly and opts in; every
 * other site never counted plus-ones before, and totalGuests-based ratios
 * (e.g. Dashboard.jsx's response rate, computed against guests.length)
 * would silently break if plus-ones were folded in by default there too.
 */

// Relative, not '@/lib/...', so this module resolves under plain Node and
// can be asserted against real records without a bundler — the same reason
// todoSort.js was extracted. Sibling-relative imports are already the
// convention in src/lib (emailBrand.js, chunkReloadGuard.js).
import { hasPlusOne, plusOneRsvpStatus } from './plusOne.js';

export const RSVP_STATUSES = ['pending', 'attending', 'declined', 'maybe'];

/** True if this specific status value counts as "hasn't responded yet" — an unset/undefined status counts as pending, same convention used everywhere already except the one buggy site this replaces. */
function isPendingStatus(status) {
  return !status || status === 'pending';
}

export const isAttending = (guestOrStatus) =>
  (typeof guestOrStatus === 'string' ? guestOrStatus : guestOrStatus?.rsvp_status) === 'attending';

export const isDeclined = (guestOrStatus) =>
  (typeof guestOrStatus === 'string' ? guestOrStatus : guestOrStatus?.rsvp_status) === 'declined';

export const isMaybe = (guestOrStatus) =>
  (typeof guestOrStatus === 'string' ? guestOrStatus : guestOrStatus?.rsvp_status) === 'maybe';

export const isPending = (guestOrStatus) =>
  isPendingStatus(typeof guestOrStatus === 'string' ? guestOrStatus : guestOrStatus?.rsvp_status);

/** A primary guest who has been invited but hasn't responded yet. */
export const isAwaitingPrimary = (guest) => !!guest?.invite_sent_at && isPendingStatus(guest.rsvp_status);

/**
 * The plus-one equivalent of isAwaitingPrimary.
 *
 * Gated on the plus-one EXISTING, not on them having an email. The old gate
 * was `!!guest?.plus_one_email`, which excluded 9 of the 40 real plus-ones —
 * they have a name and an RSVP but no email, so they were counted nowhere.
 * An email is how a plus-one is contacted, not what makes them exist.
 */
export const isAwaitingPlusOne = (guest) =>
  hasPlusOne(guest) && !!guest?.invite_sent_at && isPendingStatus(plusOneRsvpStatus(guest));

/**
 * Tallies a guest list by rsvp_status. Counts every enum value, even ones
 * no current caller displays, so the utility stays correct as new UI is
 * added.
 *
 * @param {Array<object>} guests
 * @param {{includePlusOnes?: boolean}} [options] — set true to also fold
 *   in each guest's plus-one (if plus_one_email is set) as an independent
 *   attendee with their own plus_one_rsvp_status. Default false: matches
 *   what every site except Guests.jsx already did.
 * @returns {{attending:number, declined:number, maybe:number, pending:number, awaiting:number, responded:number, total:number}}
 */
export function tallyGuestRsvp(guests, { includePlusOnes = false } = {}) {
  const list = guests || [];
  let attending = 0, declined = 0, maybe = 0, pending = 0, awaiting = 0, total = 0;

  const tallyOne = (status, awaitingFlag) => {
    total += 1;
    if (status === 'attending') attending += 1;
    else if (status === 'declined') declined += 1;
    else if (status === 'maybe') maybe += 1;
    else {
      pending += 1;
      if (awaitingFlag) awaiting += 1;
    }
  };

  for (const g of list) {
    tallyOne(g?.rsvp_status, isAwaitingPrimary(g));
    if (includePlusOnes && hasPlusOne(g)) {
      // plusOneRsvpStatus resolves derived-then-flat — see src/lib/plusOne.js.
      // Previously this read g.plus_one_rsvp_status directly and gated on
      // plus_one_email, so a plus-one without an email contributed nothing
      // to any total.
      tallyOne(plusOneRsvpStatus(g), isAwaitingPlusOne(g));
    }
  }

  return { attending, declined, maybe, pending, awaiting, responded: total - pending, total };
}

/**
 * The same tally, over a canonical ATTENDEE list, split into its two halves in
 * a single pass.
 *
 * Replaces the `includePlusOnes` boolean. That flag existed because Guests.jsx
 * needs BOTH numbers — its cards read "148" with a "121 guests, 27 plus-ones"
 * sub-label — which it obtained by tallying twice and subtracting
 * (`combined.attending - guestOnly.attending`). Returning both halves makes the
 * second pass and the subtraction unnecessary, and once every caller passes
 * attendees the flag would only ever take one value, which is a trap for the
 * next person.
 *
 * `awaiting` is NOT computed here. It needs `invite_sent_at`, which is a
 * guest-only field an Attendee deliberately does not carry — a plus-one has no
 * invitation of its own. Callers that need it tally the guests directly.
 *
 * @param {Array<import('./attendees.js').Attendee>} attendees
 * @returns {{combined:object, primaries:object, plusOnes:object}}
 */
export function tallyAttendees(attendees) {
  const list = attendees || [];
  const blank = () => ({ attending: 0, declined: 0, maybe: 0, pending: 0, total: 0 });
  const primaries = blank();
  const plusOnes = blank();

  for (const a of list) {
    const bucket = a?.isPlusOne ? plusOnes : primaries;
    bucket.total += 1;
    // Reads a.rsvp_status through the SAME predicates every page already uses.
    // This is why the Attendee field is snake_case: see the naming note in
    // attendees.js. With `.rsvpStatus` every branch below silently fell through
    // to pending.
    if (isAttending(a)) bucket.attending += 1;
    else if (isDeclined(a)) bucket.declined += 1;
    else if (isMaybe(a)) bucket.maybe += 1;
    else bucket.pending += 1;
  }

  const sum = (k) => primaries[k] + plusOnes[k];
  const combined = {
    attending: sum('attending'), declined: sum('declined'), maybe: sum('maybe'),
    pending: sum('pending'), total: sum('total'),
    responded: sum('total') - sum('pending'),
  };
  primaries.responded = primaries.total - primaries.pending;
  plusOnes.responded = plusOnes.total - plusOnes.pending;
  return { combined, primaries, plusOnes };
}
