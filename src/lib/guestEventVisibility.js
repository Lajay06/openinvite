/**
 * src/lib/guestEventVisibility.js
 *
 * WHICH EVENTS A PARTICULAR VISITOR MAY SEE ON THE COUPLE'S SITE.
 *
 * The wedding record carries every event, and until now the published site
 * showed all of them to everyone. A wedding with 500 at the ceremony and 40 at
 * the welcome drinks therefore advertised the welcome drinks to all 500, which
 * is the thing per-event invitations exist to stop. The RSVP form and the send
 * already read event_responses; the site did not.
 *
 * TWO VISITORS, TWO QUESTIONS.
 *
 *   With a personal link   The guest is known, so the answer is their own
 *                          invited set, read from event_responses through the
 *                          same resolver the dashboard uses.
 *   Without one            Nobody is known, so the answer is the set of events
 *                          that are PUBLIC: an event every guest is invited to.
 *                          One guest short and it goes behind personal links.
 *
 * WHY "EVERY GUEST", AND WHAT IT COSTS. An event the whole list is invited to
 * reveals nothing by being shown, because there is nobody it would be shown to
 * who was not already told. The moment one guest is not invited, showing it
 * publicly tells that guest about a party they are not going to, which is the
 * failure in a sharper form than a leak: it is an unkindness the couple did not
 * choose.
 *
 * The cost is real and worth stating plainly. A custom event resolves to NOT
 * invited for a guest with no entry for it (weddingEvents.js:141-175, and that
 * default is deliberate: a pre-wedding event is an opt-in). So a custom event
 * nobody has been invited to yet is not public, and does not appear on the
 * public site until the couple invites someone. That is what the invite prompt
 * on Event details already tells them: "Guests only see an event they are
 * invited to. Until you choose, nobody is invited to this one."
 *
 * A WEDDING WITH NO GUEST LIST SHOWS EVERYTHING. Vacuously, every guest of
 * none is invited. This is the right answer rather than a special case: a
 * couple who has published a site before importing their list has restricted
 * nothing, and emptying their celebration page would be an invention.
 *
 * NO NEW FIELD. The public set is computed per request from the guest list by
 * api/wedding-by-slug.js and never stored, so it cannot drift from the guest
 * list the way a cached flag would.
 */

import { getWeddingEvents, getGuestEventResponse } from './weddingEvents.js';

/**
 * The event ids this wedding may show to a visitor nobody has identified.
 *
 * Pure, and server-safe: weddingEvents.js imports only guestDate.js and
 * dressCode.js, neither of which touches React or the browser.
 *
 * @param {object} wedding       the wedding record
 * @param {Array}  guests        every guest on the list; only event_responses is read
 * @returns {string[]}           event ids, in the wedding's own order
 */
export function publicEventIds(wedding, guests = []) {
  const events = getWeddingEvents(wedding);
  const list = Array.isArray(guests) ? guests.filter(Boolean) : [];
  return events
    .filter((ev) => list.every((g) => getGuestEventResponse(g, ev).invited))
    .map((ev) => ev.event_id);
}

/**
 * The event ids to render, for whoever is actually looking.
 *
 * @param {object}        args.wedding
 * @param {object|null}   args.guest     the guest a personal link identified
 * @param {string[]|null} args.publicIds what the server computed, or null if it could not
 * @returns {string[]}
 */
export function visibleEventIds({ wedding, guest = null, publicIds = null } = {}) {
  const events = getWeddingEvents(wedding);
  if (guest) {
    return events.filter((ev) => getGuestEventResponse(guest, ev).invited).map((ev) => ev.event_id);
  }
  if (Array.isArray(publicIds)) {
    // Intersected rather than returned as given, so an id the server computed
    // against a record the client no longer has cannot resurrect an event.
    const allowed = new Set(publicIds);
    return events.filter((ev) => allowed.has(ev.event_id)).map((ev) => ev.event_id);
  }
  // ── NO ANSWER FROM THE SERVER, AND TWO VERY DIFFERENT REASONS ───────────
  //
  // THE COUPLE'S OWN RECORD. The studio previews and the website builder
  // render these same components against the full WeddingDetails record from
  // the dashboard, which no endpoint computed a public set for. Hiding events
  // there would be a bug with no upside: the couple is looking at their own
  // wedding and is entitled to see all of it. A guest-safe payload always
  // carries `locked` as a boolean (api/_lib/guestSafeWedding.js states it
  // explicitly "so the contract is total and no client has to infer it from a
  // missing key"), and a dashboard record never does, so the absence of that
  // key is what separates the two cases. Keyed on the SHAPE OF THE RECORD
  // rather than on a prop nobody would remember to pass through six preview
  // surfaces.
  if (typeof wedding?.locked !== 'boolean') {
    return events.map((ev) => ev.event_id);
  }
  // A GUEST PAYLOAD WITH NO PUBLIC SET means the guest list read failed. Main
  // events are shown and custom ones are not: the conservative half of each
  // rule, not a third rule. Main events default to invited for everyone, so
  // showing them matches what the public set would almost always have said; a
  // custom event defaults to NOT invited, so hiding it matches what it would
  // have said unless the whole list was invited. The failure therefore shows
  // less than the truth and never more, and it self-heals on the next request
  // that succeeds.
  return events.filter((ev) => ev.isMain).map((ev) => ev.event_id);
}

/**
 * The same answer as a Set, for the render paths that test one id at a time.
 */
export function visibleEventIdSet(args) {
  return new Set(visibleEventIds(args));
}

/**
 * The visible events themselves, in the wedding's own order, for the surfaces
 * that render from getWeddingEvents() rather than from a list of their own.
 *
 * @param {object} wedding
 * @param {object} [opts.guest]
 * @param {string[]|null} [opts.publicIds]
 */
export function visibleEvents(wedding, { guest = null, publicIds = null } = {}) {
  const allowed = new Set(visibleEventIds({ wedding, guest, publicIds }));
  return getWeddingEvents(wedding).filter((ev) => allowed.has(ev.event_id));
}
