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
 * Plus-ones: a guest with a plus_one_email has an independent
 * plus_one_rsvp_status. tallyGuestRsvp only folds a plus-one in as their
 * own attendee when explicitly asked (includePlusOnes: true) — Guests.jsx
 * is the one call site that already did this correctly and opts in; every
 * other site never counted plus-ones before, and totalGuests-based ratios
 * (e.g. Dashboard.jsx's response rate, computed against guests.length)
 * would silently break if plus-ones were folded in by default there too.
 */

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

/** The plus-one equivalent of isAwaitingPrimary — only meaningful if plus_one_email is set. */
export const isAwaitingPlusOne = (guest) =>
  !!guest?.plus_one_email && !!guest?.invite_sent_at && isPendingStatus(guest.plus_one_rsvp_status);

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
    if (includePlusOnes && g?.plus_one_email) {
      tallyOne(g?.plus_one_rsvp_status, isAwaitingPlusOne(g));
    }
  }

  return { attending, declined, maybe, pending, awaiting, responded: total - pending, total };
}
