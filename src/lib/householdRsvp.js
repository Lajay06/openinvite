/**
 * src/lib/householdRsvp.js
 *
 * REPLYING FOR EVERYONE ON ONE INVITATION.
 *
 * Item 5 of goals/2026-10-07-households-and-children.md. The lead's own link
 * opens the RSVP form with every member of their household on it: one status
 * and one meal choice each, because a seat, a meal and a reply have always
 * been per person and that is exactly what does not change here.
 *
 * ── WHY THE LOGIC IS HERE AND NOT IN THE PAGE ──────────────────────────────
 *
 * RSVPPage.jsx is a guest-facing page behind a capability token, so nothing in
 * the guard suite can render it. Every decision this feature makes, who
 * appears on the form, which events each member may answer, what the
 * submission carries and what it must never carry, is a pure function of the
 * loaded records. So it lives here and is asserted against real record shapes.
 *
 * ── THE READ IS THE AUTHORITY, AND THAT IS DELIBERATE ──────────────────────
 *
 * The rows this module is given come from api/rsvp-lookup.js, which withholds
 * Guest ids, emails and created dates on purpose. Deciding WHO THE LEAD IS
 * needs exactly those fields (src/lib/household.js's rule: an addressable
 * email, then the earliest created, then the id), so a browser cannot decide
 * it and must not be handed the data to try.
 *
 * So the read states it. Each row carries `is_lead` and `is_you`, computed
 * server-side from the real records, and the household form opens only when
 * the row flagged `is_you` is also the lead. That check is defense in depth
 * rather than the enforcement: the server does not return a household to a
 * token that is not a lead's, and refuses a member write from one. A rule a
 * client could bypass is not a rule, and a rule a client cannot evaluate
 * honestly must not be pretended at.
 *
 * "A member who has their own link still answers for themselves alone" is the
 * goal's rule and this is how it holds in both halves.
 *
 * ── HOW A MEMBER IS NAMED IN A SUBMISSION, AND WHY IT IS NOT AN ID ─────────
 *
 * api/rsvp-lookup.js: "all future writes are re-resolved server-side from the
 * token, never a client-supplied guest id, so the client never needs the raw
 * id at all". A household submit has to say WHICH member each answer belongs
 * to, so something must travel, and it is an opaque per-member REF the read
 * supplies: the same HMAC of the row's id that RsvpResponse already keys on
 * (guest_id_hash, api/_lib/questionnaireCrypto.js hashId).
 *
 * That keeps the endpoint's invariant intact. No raw id for another person
 * reaches the lead's browser, a ref cannot be computed for a row outside the
 * household without the server's key, and the submit matches a ref only
 * against the rows of the holder's own household that it reads itself: a
 * forged or stale ref resolves to nobody rather than to somebody else.
 *
 * AN INDEX WOULD HAVE BEEN WORSE. Two independent sorts agreeing by position
 * is a correctness argument that fails silently the day a row changes between
 * the read and the submit, and its failure applies one person's answer to
 * another person.
 *
 * A MEMBER WITH NO REF IS NOT SUBMITTED FOR: no answer recorded, rather than
 * an answer recorded against a guess.
 *
 * ── WHAT A MEMBER'S ANSWER CANNOT CARRY ────────────────────────────────────
 *
 * Plus-one controls belong to the lead, and that is enforced HERE rather than
 * only by not drawing the control: a submission built for a member who is not
 * the holder carries plus_ones: 0 and an empty plus_one_names whatever the
 * form state says. A UI rule that is not also a builder rule is one refactor
 * away from being no rule.
 *
 * AND EACH MEMBER ANSWERS ONLY WHAT THEY WERE INVITED TO, which is #891's rule
 * applied per member rather than per guest. A household where the child is not
 * at the dinner submits no dinner answer for the child, so no entry can be
 * created for an event they were never invited to.
 *
 * ── THE AGE IS THE COUPLE'S NOTE TO THEMSELVES ─────────────────────────────
 *
 * A guest sees "Child" and never a number. A member's shape carries isChild
 * for exactly that, and the guard pins that no code on the page or in this
 * module reads child_age. The couple's own dashboard is where an age belongs.
 */

import { getWeddingEvents, getGuestEventResponse } from './weddingEvents.js';

const INACTIVE = { active: false, members: [] };

/**
 * Who is on this form.
 *
 * @param {object} args
 * @param {object} args.holder     the guest the token resolved to, as the
 *   lookup returned them. Only its presence is read here: which ROW is the
 *   holder is stated by the read, not matched by this module.
 * @param {Array}  args.household  the household's rows as the lookup returned
 *   them, in the order it returned them, or nothing at all: a payload with no
 *   household renders the single guest form, which is what every link does
 *   until the held read ships.
 * @returns {{active: boolean, members: Array<{id: string, ref: string|null,
 *   name: string, guest: object, isHolder: boolean, isChild: boolean}>}}
 */
export function householdForm({ holder, household } = {}) {
  const rows = Array.isArray(household) ? household.filter(Boolean) : [];
  if (!holder || rows.length < 2) return INACTIVE;
  const you = rows.find((r) => r.is_you === true);
  if (!you || you.is_lead !== true) return INACTIVE;
  return {
    active: true,
    // NOT REORDERED AND NOT FILTERED. The read's order is the lead rule
    // applied to rows this module cannot see, so re-sorting here could only
    // disagree with it.
    members: rows.map((r) => ({
      // The form's own key for its state. A ref for everyone but the holder,
      // whose answers live in the page's existing per-event state.
      id: r.ref || (r.is_you ? 'you' : r.name),
      ref: r.ref || null,
      name: r.name,
      guest: r,
      isHolder: r === you,
      isChild: r.is_child === true,
    })),
  };
}

/** The events this member may answer: #891's rule, per member. */
export function memberEvents(member, wedding) {
  const row = member?.guest || member;
  if (!wedding) return [];
  return getWeddingEvents(wedding).filter((ev) => getGuestEventResponse(row, ev).invited);
}

/**
 * The form state a returning household sees: each member's own stored answer,
 * so nobody's reply is blanked by someone else arriving at the page.
 *
 * @returns {object} { [memberId]: { [eventId]: {status, meal_choice, ...} } }
 */
export function seedMemberForms(members = [], wedding) {
  const out = {};
  for (const m of members) {
    const perEvent = {};
    for (const ev of memberEvents(m, wedding)) {
      const r = getGuestEventResponse(m.guest || m, ev);
      // A STORED MAYBE SEEDS AS UNANSWERED, same reason as RSVPPage.jsx's own
      // seed: this form's submit below filters on a truthy status, so an empty
      // one is left out of the write entirely and the couple's recorded maybe
      // survives. A seeded 'maybe' is truthy, would be submitted, and
      // api/rsvp-submit.js would coerce it to pending. Owner ruling 2026-10-09.
      perEvent[ev.event_id] = {
        status: (r.status === 'pending' || r.status === 'maybe') ? '' : r.status,
        meal_choice: r.meal_choice || '',
        plus_one_attending: (r.plus_ones || 0) > 0,
        plus_one_name: (r.plus_one_names || [])[0] || '',
      };
    }
    out[m.id] = perEvent;
  }
  return out;
}

/**
 * The per-member half of the submission. The holder's own answers travel in
 * `event_responses` exactly as they do today, so a household submit is the
 * existing payload plus a `members` array and nothing re-shaped.
 *
 * @returns {Array<{ref: string, event_responses: Array}>}
 */
export function memberSubmissions({ members = [], forms = {}, wedding, now } = {}) {
  return members
    // NO REF, NO SUBMISSION, and the holder is not a member of this list: their
    // answers are the page's own.
    .filter((m) => m && !m.isHolder && m.ref)
    .map((m) => ({
      ref: m.ref,
      // ONLY ANSWERS TRAVEL. An event this member has not answered is left out
      // rather than sent as pending: a pending entry stamped with a
      // responded_at is a record of a reply that did not happen, and the submit
      // is gated on everyMemberAnswered anyway.
      event_responses: memberEvents(m, wedding)
        .filter((ev) => ((forms[m.id] || {})[ev.event_id] || {}).status)
        .map((ev) => {
          const f = (forms[m.id] || {})[ev.event_id] || {};
          const yes = f.status === 'yes';
          return {
            event_id: ev.event_id,
            status: f.status,
            meal_choice: yes ? (f.meal_choice || null) : null,
            // THE LEAD'S CONTROL, AND THE LEAD'S ALONE. Not a UI rule only.
            plus_ones: 0,
            plus_one_names: [],
            responded_at: now,
          };
        }),
    }))
    .filter((m) => m.event_responses.length > 0);
}

/**
 * Whether every member other than the holder has answered everything they were
 * invited to. The holder's own completeness is the page's existing check, and
 * the two are deliberately separate: they are about different form state.
 */
export function everyMemberAnswered({ members = [], forms = {}, wedding } = {}) {
  return members
    .filter((m) => m && !m.isHolder)
    .every((m) => {
      const evs = memberEvents(m, wedding);
      if (evs.length === 0) return true;
      return evs.every((ev) => (forms[m.id] || {})[ev.event_id]?.status);
    });
}

/**
 * The names still missing an answer, for a message that says who rather than
 * how many. Children included: the couple asked for their answer too.
 */
export function membersStillToAnswer({ members = [], forms = {}, wedding } = {}) {
  return members
    .filter((m) => m && !m.isHolder)
    .filter((m) => {
      const evs = memberEvents(m, wedding);
      return evs.length > 0 && !evs.every((ev) => (forms[m.id] || {})[ev.event_id]?.status);
    })
    .map((m) => m.name)
    .filter(Boolean);
}
