/**
 * src/lib/attendees.js
 *
 * ONE canonical answer to "who is actually coming to this wedding".
 *
 * WHY THIS EXISTS
 * ---------------
 * A plus-one is not a record. There is no attendee, companion or plus-one
 * entity anywhere in the app — the Guest record is the only container, and the
 * schema says so itself in RsvpResponse.guest_id_hash's description: "The
 * primary guest and their plus-one share the same underlying guest_id_hash
 * (there is no separate Guest record for a plus-one)."
 *
 * The consequence is that a plus-one has no id, and anything keyed by id
 * therefore cannot hold one. Table.assigned_guests[].guest_id requires a Guest
 * id, so **a plus-one cannot be seated at all today**. Eight different places
 * in the app count guests, each with its own idea of what a plus-one is, and
 * they disagree.
 *
 * This module gives every attendee — primary or plus-one — a stable id, so
 * they can be counted once, the same way, everywhere, and so a plus-one can be
 * referenced by something that needs an id.
 *
 * NO SCHEMA CHANGE, NO MIGRATION. The plus-one's id is synthesised from the
 * host's id on read. Nothing new is written and nothing existing moves.
 *
 * SCOPE: MODEL 1 ONLY
 * -------------------
 * There are three parallel representations of a plus-one in this codebase:
 *   1. the seven flat Guest.plus_one_* columns (one plus-one, with identity)
 *   2. Guest.event_responses[].plus_ones + .plus_one_names (per-event, a count
 *      and bare strings)
 *   3. RsvpResponse rows stamped is_plus_one:true (per-event; the source that
 *      api/my-guests-rsvp.js derives plus_one_rsvp_status from)
 *
 * This module resolves from (1) only, and reads (3) indirectly through
 * plusOne.js's RSVP precedence. Reconciling (2) is a real product decision
 * about precedence and is deliberately NOT attempted here.
 *
 * THE EXISTENCE GATE AND RSVP PRECEDENCE ARE NOT REIMPLEMENTED
 * ------------------------------------------------------------
 * Both are imported from ./plusOne.js, which is what the guest table and the
 * guest tally already use. If this resolver and the table ever disagreed about
 * whether a plus-one exists or what their RSVP is, we would have rebuilt the
 * exact problem this module exists to remove.
 */

import { hasPlusOne, plusOneRsvpStatus, plusOneDisplayName } from './plusOne.js';

/**
 * Appended to the host's Guest id to make the plus-one's id.
 *
 * Base44 ids are 24-character lowercase hex (Mongo ObjectId shape, e.g.
 * 68731d183f075e406eda2236). ':' is not in that alphabet, so a synthetic id can
 * never collide with a real one no matter how many guests exist. The separator
 * is also unambiguous to split on: a real id contains no ':' to confuse it.
 */
export const PLUS_ONE_ID_SUFFIX = '::plus-one';

/** The plus-one id for a given host Guest id. Deterministic and pure. */
export function plusOneIdFor(hostGuestId) {
  return `${hostGuestId}${PLUS_ONE_ID_SUFFIX}`;
}

/** Is this id synthetic (a plus-one) rather than a real Guest id? */
export function isPlusOneId(id) {
  return typeof id === 'string' && id.endsWith(PLUS_ONE_ID_SUFFIX);
}

/**
 * Recover the host's real Guest id from a synthetic one.
 * Returns null for a real id, so callers can branch without a second check.
 */
export function hostIdFromAttendeeId(id) {
  if (!isPlusOneId(id)) return null;
  return id.slice(0, -PLUS_ONE_ID_SUFFIX.length);
}

/**
 * @typedef {Object} Attendee
 * @property {string} id           real Guest id, or host id + PLUS_ONE_ID_SUFFIX
 * @property {boolean} isPlusOne
 * @property {string|null} hostGuestId  the primary's id when isPlusOne, else null
 * @property {string} name
 * @property {string} email             '' when unknown — a plus-one often has none
 * @property {string} rsvpStatus        'pending' | 'attending' | 'declined'
 * @property {string} mealChoice        '' when unset
 * @property {string} dietaryRestrictions '' when unset
 * @property {Object} guest             the Guest record this came from (the HOST
 *                                      record for a plus-one, since there is no
 *                                      other record to point at)
 */

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));

function primaryAttendee(guest) {
  return {
    id: guest.id,
    isPlusOne: false,
    hostGuestId: null,
    name: str(guest.name),
    email: str(guest.email),
    // Left exactly as stored. Normalising it here would silently disagree with
    // every existing consumer that reads guest.rsvp_status directly.
    rsvpStatus: str(guest.rsvp_status) || 'pending',
    mealChoice: str(guest.meal_choice),
    dietaryRestrictions: str(guest.dietary_restrictions),
    guest,
  };
}

function plusOneAttendee(guest) {
  return {
    id: plusOneIdFor(guest.id),
    isPlusOne: true,
    hostGuestId: guest.id,
    name: plusOneDisplayName(guest),
    email: str(guest.plus_one_email),
    // Derived-then-flat precedence, straight from plusOne.js. Not reimplemented.
    rsvpStatus: plusOneRsvpStatus(guest),
    mealChoice: str(guest.plus_one_meal_choice),
    dietaryRestrictions: str(guest.plus_one_dietary_restrictions),
    guest,
  };
}

/**
 * The canonical attendee list: every primary guest, plus one entry for each
 * guest who actually has a plus-one.
 *
 * Order is stable and meaningful: each plus-one immediately follows its host,
 * so the list reads the way an invitation does and so slicing it never
 * separates a pair.
 *
 * A guest with no id is skipped entirely. Without an id there is nothing to key
 * the primary on and nothing to derive a plus-one id from, so including it
 * would produce an attendee that cannot be seated, deduped or referenced — the
 * failure this module exists to prevent.
 *
 * @param {Array<Object>} guests
 * @returns {Array<Attendee>}
 */
export function resolveAttendees(guests) {
  if (!Array.isArray(guests)) return [];
  const out = [];
  for (const guest of guests) {
    if (!guest || !guest.id) continue;
    out.push(primaryAttendee(guest));
    if (attendsAsPlusOne(guest)) out.push(plusOneAttendee(guest));
  }
  return out;
}

/**
 * Does this guest bring a countable plus-one?
 *
 * This is the SHIPPED existence gate, narrowed — not a reimplementation of it.
 * hasPlusOne() from plusOne.js still decides the base case; this adds one
 * further condition on top.
 *
 * The narrowing: `plus_one: true` on its own is a PERMISSION, not a person. It
 * means "this guest may bring someone", not "someone is coming". hasPlusOne()
 * accepts that bare boolean, because it answers a DISPLAY question — "should
 * the guest table show a plus-one row here" — where rendering an empty slot the
 * couple can fill in is exactly right. Guests.jsx's "Total guests" card then
 * reuses the same signal as a HEAD COUNT (`+ guests.filter(g => g.plus_one)
 * .length`), which silently inflates the total by every unfilled invitation.
 * That is one of the eight counting bugs, and this resolver must not inherit it.
 *
 * So an attendee needs an identity — a name or an email — before it is a person
 * to count, seat and feed.
 *
 * ANSWERS: "is there a PERSON here to count, seat and feed?" Its counterpart
 * is hasPlusOne() in src/lib/plusOne.js, which answers the DISPLAY question
 * "is this guest permitted to bring someone, or has one been named?" Both are
 * correct for their own question and both should survive.
 *
 * THIS IS A DELIBERATE, NARROW DIVERGENCE FROM THE GUEST TABLE, and the only
 * one. For a guest flagged `plus_one: true` with neither a name nor an email,
 * the table shows a row and this list yields no attendee. Everywhere else the
 * two agree by construction, because the gate below and the RSVP precedence
 * both come from plusOne.js rather than being restated here.
 *
 * In the 202 live records the divergence is currently empty: all 40 plus-ones
 * carry `plus_one: true` AND a name AND a plus_one_rsvp simultaneously, so no
 * record exercises it today. It is guarded by assertion rather than by luck.
 */
export function attendsAsPlusOne(guest) {
  if (!hasPlusOne(guest)) return false;
  return !!(str(guest.plus_one_name) || str(guest.plus_one_email));
}
