/**
 * src/lib/plusOne.js
 *
 * One place that answers two questions about a guest's plus-one:
 * does one exist, and what is their RSVP status.
 *
 * WHY THIS EXISTS
 * ---------------
 * A plus-one is not a record. There is no attendee, companion or plus-one
 * entity anywhere in the app — the Guest record is the only container, and
 * the schema says so itself in RsvpResponse.guest_id_hash's description:
 * "The primary guest and their plus-one share the same underlying
 * guest_id_hash (there is no separate Guest record for a plus-one)."
 *
 * That leaves three parallel representations of a plus-one:
 *   1. the flat Guest.plus_one_* columns (one plus-one, with identity)
 *   2. Guest.event_responses[].plus_ones + .plus_one_names (per-event, a
 *      count and bare strings)
 *   3. RsvpResponse rows stamped is_plus_one:true (per-event, the source
 *      api/my-guests-rsvp.js derives plus_one_rsvp_status from)
 *
 * This module deals only with (1) and (3), which are what the guest table
 * and the guest tally read. (2) is the seating/per-event model and is
 * deliberately untouched here.
 *
 * PRECEDENCE: derived first, flat as FALLBACK
 * -------------------------------------------
 * plus_one_rsvp_status is a DERIVED overlay attached by
 * getMyGuestsWithRsvp() -> api/my-guests-rsvp.js:161. It is not a schema
 * field. It is computed from is_plus_one:true RsvpResponse rows only, and
 * it never consults the flat Guest.plus_one_rsvp column.
 *
 * The flat column is used only when the derived value is absent. It is NOT
 * authoritative, deliberately: as of this change it has exactly one writer
 * in the whole codebase — src/pages/WeddingWebsite.jsx — and that file has
 * no route in App.jsx (the public wedding site is served by
 * components/guest-website/MultiPageWeddingWebsite). So nothing a guest or
 * a couple can currently do writes it; every populated value in production
 * came from scripts/seed-demo-data.mjs.
 *
 * Keeping it as a fallback means the records that already have a derived
 * status keep using it, so this change cannot flip a badge that is
 * currently correct. Promoting the flat column to authoritative should wait
 * until something reachable writes it.
 *
 * THE GATE IS THE BUG THIS FIXES
 * ------------------------------
 * GuestList.jsx's PlusOneCell and guestRsvpTally's includePlusOnes both
 * gated on `guest.plus_one_email`. Measured against the 202 real guest
 * records: 40 carry a plus-one, 31 have an email, 9 do not. Those 9 have a
 * name and a plus_one_rsvp and were shown no status at all and counted
 * nowhere. An email is how a plus-one is *contacted*; it is not what makes
 * them exist.
 */

/** RSVP values the Guest schema's plus_one_rsvp enum allows. */
export const PLUS_ONE_RSVP_STATUSES = ['pending', 'attending', 'declined'];

/**
 * Does this guest have a plus-one at all?
 *
 * Any of the three signals counts. In the 202 live records all 40
 * plus-ones satisfy all three simultaneously (plus_one true AND a name AND
 * a plus_one_rsvp), so the edges of this definition are currently
 * untested — a guest flagged `plus_one: true` with no name has never
 * occurred. Included anyway because Guests.jsx's "Total guests" card
 * already treats the bare boolean as a head (`+ guests.filter(g =>
 * g.plus_one).length`), and disagreeing with it here would add a ninth
 * counting rule to an app that already has eight.
 */
export function hasPlusOne(guest) {
  if (!guest) return false;
  return guest.plus_one === true
    || !!(guest.plus_one_name && String(guest.plus_one_name).trim())
    || !!(guest.plus_one_email && String(guest.plus_one_email).trim());
}

/**
 * The plus-one's RSVP status: the derived overlay when present, the flat
 * column when not, 'pending' when neither says anything.
 *
 * @returns {'pending'|'attending'|'declined'}
 */
export function plusOneRsvpStatus(guest) {
  if (!guest) return 'pending';
  const derived = guest.plus_one_rsvp_status;
  if (derived && PLUS_ONE_RSVP_STATUSES.includes(derived)) return derived;
  const flat = guest.plus_one_rsvp;
  if (flat && PLUS_ONE_RSVP_STATUSES.includes(flat)) return flat;
  return 'pending';
}

/** Which of the two sources actually answered — for tests and diagnostics. */
export function plusOneRsvpSource(guest) {
  if (!guest || !hasPlusOne(guest)) return 'none';
  const derived = guest.plus_one_rsvp_status;
  if (derived && PLUS_ONE_RSVP_STATUSES.includes(derived)) return 'derived';
  const flat = guest.plus_one_rsvp;
  if (flat && PLUS_ONE_RSVP_STATUSES.includes(flat)) return 'flat';
  return 'default';
}

/** The plus-one's display name, or a neutral placeholder. */
export function plusOneDisplayName(guest) {
  const n = guest?.plus_one_name && String(guest.plus_one_name).trim();
  return n || 'Plus one';
}
