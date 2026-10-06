/**
 * src/lib/statusWrite.js
 *
 * RECORDING A STATUS BY HAND, AS PER-EVENT ANSWERS.
 *
 * Advisor ruling, 2026-10-07: a guest's status is derived from event_responses
 * everywhere, and the flat Guest.rsvp_status column is a landing field that
 * writers may set and nothing reads for display. So when the couple records a
 * status themselves, on the guest editor or in an imported spreadsheet, that
 * has to become a real per-event answer or it becomes nothing at all.
 *
 * ── TWO KINDS OF WRITE TO event_responses, AND THEY HAVE DIFFERENT RULES ───
 *
 * This is the distinction the module exists to hold, and getting it wrong is
 * visible to guests rather than to the couple.
 *
 * AN INVITATION WRITE decides who is invited, and it writes the FULL RESOLVED
 * SET: one entry per event, every time, each carrying its own invited flag.
 * That is the contract from goals/2026-10-01-per-event-invitations.md, and the
 * surfaces bound by it are the Guests page's "Invited to" chips, bulk invite
 * and remove, and SetEventsModal. The reason for the full set is that a
 * partial array is a shape nothing should store: an absent entry and an entry
 * saying false mean different things, and an invitation write is the one place
 * entitled to say either.
 *
 * A STATUS WRITE answers for the guest, and it is NARROW. It touches `status`
 * and `responded_at` on the entries for events the guest is ALREADY invited
 * to, and nothing else. It never adds, removes or changes an `invited` key on
 * an entry that exists; it never creates an entry for an event the guest is
 * not invited to; every other entry comes through byte for byte.
 *
 * ── WHY NARROW, AND IT IS NOT TIDINESS ─────────────────────────────────────
 *
 * An explicit `invited: false` is a REMOVAL under the 2026-10-06 ruling, and a
 * removal takes the event off the couple's PUBLIC guest site
 * (src/lib/guestEventVisibility.js). If a status write wrote the full resolved
 * set, then marking one guest "attending" in the editor would stamp
 * `invited: false` on every custom event that guest is not invited to, and the
 * welcome drinks would silently disappear from the public page. A couple
 * recording an RSVP is not making an invitation decision and must not be able
 * to express one by accident, least of all one that changes what strangers
 * see.
 *
 * Measured before the rule was written: the full-set version of this write
 * took publicEventIds from three events to two on a wedding where nobody had
 * been removed from anything.
 *
 * ── "MAYBE" HAS NO PER-EVENT EQUIVALENT ────────────────────────────────────
 *
 * The editor offers Pending, Attending, Declined and Maybe. The per-event
 * `status` enum is pending, yes, no (base44/entities/Guest.jsonc), so Maybe
 * maps to pending: the guest has given neither a yes nor a no, which is what
 * pending means. The flat column still records 'maybe' alongside, but nothing
 * reads it any more, so a couple choosing Maybe now sees the same thing as
 * Pending on every surface.
 *
 * THAT IS A REAL LOSS AND IT IS NOT FIXED HERE. The two ways out are a schema
 * change to the status enum, which goals/2026-10-07-rsvp-status-source.md
 * bars, or taking Maybe off the editor, which is a chrome decision. Reported
 * rather than decided.
 */

import { getGuestEventResponse } from './weddingEvents.js';

/** The flat column's vocabulary, in the per-event column's vocabulary. */
const PER_EVENT_STATUS = {
  attending: 'yes',
  declined: 'no',
  pending: 'pending',
  maybe: 'pending',
};

/**
 * Whether a flat status is one this module knows how to record. An unknown
 * value writes nothing rather than guessing: the entries stay as they are.
 */
export function isRecordableStatus(status) {
  return Object.prototype.hasOwnProperty.call(PER_EVENT_STATUS, String(status));
}

/**
 * The event_responses array to persist after the couple records `status`.
 *
 * @param {object}   args
 * @param {Array}    args.events    every event on the wedding, from getWeddingEvents
 * @param {object}   args.guest     the guest, read for its existing event_responses
 * @param {string}   args.status    a flat Guest.rsvp_status value
 * @param {string}   [args.now]     ISO timestamp, injectable so a guard is not timing-dependent
 * @returns {Array}  the full array to write, existing order preserved
 */
export function applyStatusToEventResponses({ events = [], guest = {}, status, now = null }) {
  if (!isRecordableStatus(status)) return Array.isArray(guest?.event_responses) ? guest.event_responses : [];

  const perEvent = PER_EVENT_STATUS[String(status)];
  // RESPONDED_AT IS CLEARED BY PENDING, not left at the old date. A row that
  // says pending and carries a timestamp claims somebody answered and then
  // unanswered, which is not a state the product has.
  const respondedAt = perEvent === 'pending' ? null : (now || new Date().toISOString());

  const existing = Array.isArray(guest?.event_responses) ? guest.event_responses : [];
  // The events this guest is invited to, resolved the same way every other
  // surface resolves it: a stored entry wins, and an absent one defaults by
  // whether the event is a main one.
  const invitedIds = new Set(
    events.filter((ev) => getGuestEventResponse(guest, ev).invited).map((ev) => ev.event_id));

  // EXISTING ENTRIES FIRST, IN THEIR OWN ORDER. `invited` is copied, never
  // computed: this write has no opinion about who is invited.
  const seen = new Set();
  const out = existing.map((entry) => {
    if (!entry || !invitedIds.has(entry.event_id)) return entry;
    seen.add(entry.event_id);
    return { ...entry, status: perEvent, responded_at: respondedAt };
  });
  for (const e of existing) if (e?.event_id) seen.add(e.event_id);

  // THEN THE INVITED EVENTS THAT HAD NO ENTRY AT ALL, in the wedding's order.
  // These are the only entries this write creates, and they carry invited:true
  // because the resolver has just said this guest is invited to them.
  for (const ev of events) {
    if (!invitedIds.has(ev.event_id) || seen.has(ev.event_id)) continue;
    out.push({ event_id: ev.event_id, invited: true, status: perEvent, responded_at: respondedAt });
  }
  return out;
}
