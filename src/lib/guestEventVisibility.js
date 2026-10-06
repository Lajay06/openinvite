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
 * THREE RULES, AND THE THIRD IS WHY THE FIRST TWO CAN BOTH BE TRUE.
 *
 *   PUBLIC     What a visitor nobody has identified sees: every event except
 *              one the couple has taken a guest OFF.
 *   PERSONAL   What a guest's own link adds: every event they are invited to,
 *              read from event_responses through the same resolver the
 *              dashboard uses.
 *   UNION      What a guest actually sees: the two sets added together. A
 *              GUEST CAN NEVER SEE FEWER EVENTS THAN A STRANGER.
 *
 * WHY THE UNION, AND WHAT IT FIXED. For one release the two rules were applied
 * separately, and they disagreed. A wedding invites 40 of its 500 guests to the
 * welcome drinks and leaves the other 460 untouched: nobody has been removed,
 * so the event is public and a passer-by with no link sees it, while one of
 * those 460 following their OWN link resolved to not-invited and did not. A
 * guest saw less than a stranger, and the more personal the link the less it
 * showed, which is the opposite of what a personal link is for. The union is
 * the whole fix: the personal set only ever ADDS.
 *
 * ONE EXCEPTION, AND IT IS NOT A SOFTENING OF THE UNION. An EXPLICIT
 * invited:false on this guest's own record always wins, even over the public
 * set. A removal is a positive act recorded on the guest in hand; a public set
 * is an answer computed somewhere else, from a list this guest may not have
 * been in when it was computed.
 *
 * It fires whenever the public set says an event is public and this guest's
 * own record says they were taken off it. Three ways to get there:
 *
 *   the failure branch   at the bottom of this file, where the public set
 *                        could not be computed and the main events are shown
 *                        on trust. A guest the couple deliberately took off
 *                        the reception must not be shown the reception
 *                        because a guest-list read failed somewhere else.
 *   a stale set          a guest removed after the response was computed, or
 *                        a cached payload.
 *   a decoupled set      the render fixture does this deliberately, keeping
 *                        the reception public while PER_EVENT_GUEST is removed
 *                        from it, so both halves of the rule can be rendered
 *                        on one wedding.
 *
 * It CANNOT fire against a public set computed from the full current guest
 * list including this guest, because there a removal is exactly what makes the
 * event non-public and the two rules already agree.
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
 * THE ASYMMETRY THAT RULING LEFT BEHIND IS CLOSED by the union above. It was
 * raised in #889 rather than resolved there, and the owner ruled for the union
 * in goals/2026-10-06-per-event-follow-up.md.
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
  const stranger = new Set(strangerEventIds({ wedding, events, publicIds }));
  if (!guest) {
    return events.filter((ev) => stranger.has(ev.event_id)).map((ev) => ev.event_id);
  }
  // ── THE UNION, WRITTEN SO THE INVARIANT IS STRUCTURAL ───────────────────
  //
  // Every id a stranger would get, plus every id this guest is invited to.
  // Built by filtering the wedding's own event list, so the order is the
  // wedding's and not the order the two sets happened to be computed in.
  //
  // It is the same `stranger` set the branch above returns, which is the point:
  // "a guest can never see fewer events than a stranger" is not a property
  // anyone has to remember to keep, because the guest's answer is built FROM
  // the stranger's answer. There is no arrangement of these three inputs that
  // can make the guest's set smaller.
  //
  // THE ONE EXCEPTION is wasRemovedFrom, and the header lists the three ways it
  // fires: an explicit removal on this guest's own record beats a public set
  // that is missing, stale, or computed from a list this guest was not in. It
  // subtracts nothing from a set computed over the full current list, because
  // there a removal is what makes the event non-public in the first place.
  return events
    .filter((ev) => !wasRemovedFrom(guest, ev)
      && (stranger.has(ev.event_id) || getGuestEventResponse(guest, ev).invited))
    .map((ev) => ev.event_id);
}

/**
 * What a visitor nobody has identified sees. Split out of visibleEventIds so
 * the guest's answer can be built from it rather than beside it.
 */
function strangerEventIds({ wedding, events, publicIds }) {
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
