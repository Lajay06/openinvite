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
import { effectiveMealChoice } from './weddingEvents.js';

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
 * MEAL — a discriminated value, not a bare string.
 *
 * `Guest.meal_choice` and `Guest.plus_one_meal_choice` are DEAD COLUMNS.
 * Nothing writes them once a guest RSVPs; the live answer is the per-event
 * overlay, `event_responses[].meal_choice` for a primary and
 * `plus_one_event_responses[].meal_choice` for a plus-one. That is documented
 * in five files under fix/vestigial-meal-choice-reads — and until this change
 * THIS MODULE was the last live reader of the dead columns in dashboard code,
 * which is worse than carrying nothing, because it looks like data.
 *
 * Those overlays are attached by api/my-guests-rsvp.js. A caller holding raw
 * Guest entities (a script, a direct entity read) has no overlay at all, and
 * "this input never carried meal data" must not be confused with "this person
 * chose no meal". One is a gap in the input, the other is a fact about a
 * person, and a caterer acting on the second when the first is true is how
 * someone gets served the wrong dinner.
 *
 * Same discipline as the weather states: the state is explicit, and a caller
 * that renders `.value` without checking `.state` gets null rather than a
 * confident wrong answer.
 */
export const MEAL_CHOSEN     = 'chosen';      // a real selection
export const MEAL_NONE       = 'none';        // overlay present, no meal picked
export const MEAL_NOT_LOADED = 'not-loaded';  // this input carries no overlay

const mealChosen   = (value) => ({ state: MEAL_CHOSEN, value });
const mealNone     = ()      => ({ state: MEAL_NONE, value: null });
const mealNotLoaded = ()     => ({ state: MEAL_NOT_LOADED, value: null });

/**
 * `undefined` means the field was never attached (raw entity, unhydrated).
 * An empty array means the overlay ran and found nothing — a real answer.
 */
function resolveMeal(overlay) {
  if (!Array.isArray(overlay)) return mealNotLoaded();
  const choice = effectiveMealChoice(overlay);
  return choice ? mealChosen(choice) : mealNone();
}

/**
 * FIELD NAMING — snake_case, matching the Guest record, NOT camelCase.
 *
 * Every field an existing shared helper already reads keeps that helper's exact
 * name. This is not a style preference. `isAttending`, `isDeclined` and
 * `isPending` in guestRsvpTally.js read `.rsvp_status`; an Attendee carrying
 * `.rsvpStatus` instead made `isAttending(attendee)` return **false for an
 * attendee who is attending** — no error, no warning, just five counters
 * quietly becoming zero, through build, lint and a smoke test alike.
 *
 * The only camelCase fields are `isPlusOne` and `hostGuestId`, which are new
 * concepts no Guest record has and no existing helper reads.
 *
 * GUEST-ONLY FIELDS ARE DELIBERATELY ABSENT: no `invite_sent_at`, no
 * `table_assignment`, no `event_responses`, and no `guest` back-reference.
 * A plus-one has no invitation of its own, can hold no table (Table.
 * assigned_guests[].guest_id needs a real Guest id), and has no event responses
 * — the host's are the HOST's. Anything reaching for one of those on an
 * attendee gets `undefined` immediately, which is the point: undefined is
 * loud, whereas silently serving the host's value is a wrong answer that looks
 * right. Callers that genuinely need a guest field look it up by id from the
 * guests array themselves, for primaries only, and say so.
 *
 * @typedef {Object} Attendee
 * @property {string} id            real Guest id, or host id + PLUS_ONE_ID_SUFFIX
 * @property {boolean} isPlusOne    the explicit marker — never infer from the id
 * @property {string|null} hostGuestId  the primary's id when isPlusOne, else null
 * @property {string} name
 * @property {string} email         '' when unknown — a plus-one often has none
 * @property {string} rsvp_status   'pending' | 'attending' | 'declined'
 * @property {{state:string, value:string|null}} meal  see the MEAL_* note above.
 *   NOT a bare string, and there is deliberately no `meal_choice` field: the
 *   column of that name is dead, and mirroring it made this module the last
 *   live reader of it.
 * @property {string} dietary_restrictions '' when unset. A PLAIN value, unlike
 *   meal, because this one is real: the couple writes it from GuestForm.jsx
 *   (:102/:107 primary, :120/:125 plus-one), GuestList.jsx:509 inline and
 *   Guests.jsx:767 in bulk. api/my-guests-rsvp.js:163 overlays the guest's own
 *   RSVP answer over the top, but writes it back into THIS SAME field name, so
 *   reading it is correct hydrated or raw. That is exactly what meal does not
 *   do, and the whole reason meal needs a state and this does not.
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
    rsvp_status: str(guest.rsvp_status) || 'pending',
    meal: resolveMeal(guest.event_responses),
    dietary_restrictions: str(guest.dietary_restrictions),
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
    rsvp_status: plusOneRsvpStatus(guest),
    // The PLUS-ONE's own overlay, never the host's event_responses. Reaching
    // for the host's would tell a caterer the plus-one ate whatever the primary
    // guest ordered.
    meal: resolveMeal(guest.plus_one_event_responses),
    dietary_restrictions: str(guest.plus_one_dietary_restrictions),
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
