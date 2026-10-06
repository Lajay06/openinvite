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
 *                          that are PUBLIC: every event except one the couple
 *                          has taken a guest OFF.
 *
 * "NOBODY INVITED" IS NOT "REMOVED". Advisor ruling, 2026-10-06, and it
 * replaced the rule this file shipped with, so both are written down.
 *
 * The first rule was "public only if every guest resolves invited". It read
 * correctly and it was wrong in practice, because a custom event resolves to
 * NOT invited for a guest with no entry for it (weddingEvents.js:141-175: a
 * pre-wedding event is an opt-in, deliberately). So on that rule a custom
 * event nobody had been invited to yet was not public, and every already
 * published wedding with a pre-wedding event and no per-event invitations set
 * would have lost that event from its public page the moment this shipped. An
 * absent entry is not an act. The couple did nothing; the page should not
 * change.
 *
 * THE RULE NOW: an event is hidden from the public page only when at least one
 * guest carries an EXPLICIT invited:false for it. That is the only state the
 * couple can reach by choosing it, through "Remove from..." on the guest list,
 * and it is the state that makes showing the event publicly an unkindness:
 * telling someone about a party they have been taken off. An event with no
 * per-event rows on any guest is exactly as public as it was yesterday.
 *
 * READ AS === false, which is the ruling's own word. Every row the product
 * writes carries `invited` as a real boolean (resolveAllEventResponses writes
 * `!!`, rsvp-submit's sanitizer writes true), so a stored row is never
 * ambiguous. A row that somehow arrived without the key is therefore NOT a
 * removal, which keeps the event public: the direction this ruling chose
 * whenever the data does not clearly say otherwise.
 *
 * A WEDDING WITH NO GUEST LIST SHOWS EVERYTHING, now for the plain reason that
 * nobody has been removed from anything.
 *
 * WHAT THE PERSONAL LINK DOES IS UNCHANGED, and the two rules are no longer
 * symmetrical. A guest with no row for a public custom event does not see it
 * on their own link, while a stranger with no link does. The goal is explicit
 * about the personal-link half ("show only the events the guest is invited
 * to"), and this ruling amended only the public half, so the asymmetry is
 * deliberate rather than overlooked. It is raised in #889 for a ruling of its
 * own rather than resolved here by inventing a union.
 *
 * NO NEW FIELD. The public set is computed per request from the guest list by
 * api/wedding-by-slug.js and never stored, so it cannot drift from the guest
 * list the way a cached flag would.
 */

import { getWeddingEvents, getGuestEventResponse } from './weddingEvents.js';

/**
 * Whether this guest has been TAKEN OFF this event, as opposed to never having
 * been put on it. The stored row only, never the resolver: the resolver's job
 * is to answer "is this guest invited", and its answer for an absent row is a
 * default, which is precisely what this question has to be able to ignore.
 */
function wasRemovedFrom(guest, event) {
  const responses = guest?.event_responses;
  if (!Array.isArray(responses)) return false;
  return responses.some((r) => r?.event_id === event.event_id && r.invited === false);
}

/**
 * The event ids this wedding may show to a visitor nobody has identified.
 *
 * Every event, less any the couple has taken a guest off. See the ruling in
 * the header for why this is not "every event the whole list is invited to".
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
    .filter((ev) => !list.some((g) => wasRemovedFrom(g, ev)))
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
  // A GUEST PAYLOAD WITH NO PUBLIC SET means the guest list read failed, and
  // the main events are shown while the custom ones are not.
  //
  // THIS IS THE ONE PLACE THE 2026-10-06 RULING IS NOT PRESERVED, so it is
  // named rather than left to be discovered. Under that ruling a custom event
  // is public unless somebody was removed from it, so the custom events here
  // are PROBABLY public and withholding them is probably wrong. It is kept
  // anyway: whether anyone was removed is exactly the fact that failed to
  // load, and the alternative publishes an event somebody may have been taken
  // off. A guest sees the ceremony and the reception for the length of one
  // failed request, which is a transient loss; the other direction is a
  // disclosure that cannot be taken back. Raised in #889 rather than settled
  // here, since the ruling did not reach this branch.
  //
  // A main event is shown because being at the wedding is the baseline, which
  // is the same reasoning weddingEvents.js gives for its own default.
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
