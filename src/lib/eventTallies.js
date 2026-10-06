/**
 * src/lib/eventTallies.js
 *
 * HOW MANY PEOPLE PER EVENT, AND HOW MANY HAVE ANSWERED.
 *
 * Every surface that reports on RSVPs reported on the wedding as one thing:
 * "94 invitations sent, 61 still to reply". For a wedding with 500 at the
 * ceremony and 300 at the reception that is an average of two different
 * questions, and the couple cannot act on it. The data to answer it properly
 * has been on Guest.event_responses since per-event RSVP shipped.
 *
 * COUNTED PER INVITATION, which is the owner's standing ruling on the 94
 * versus 61 split (guestRsvpTally.js carries the same note). One guest row is
 * one invitation whatever its plus-ones; a plus-one does not hold an invited
 * flag of its own, because event_responses lives on the guest record and the
 * plus-one travels with it. So these numbers are directly comparable with the
 * "Invitations" line and NOT with the "people coming" line.
 *
 * REPLIED MEANS ANSWERED, not "has an entry". An entry with invited:true and
 * status pending is the couple's own doing; a yes or a no came from the guest.
 * The same line src/lib/eventDeletion.js draws, for the same reason.
 *
 * ABSENT ENTRIES RESOLVE, they are not skipped. getGuestEventResponse defaults
 * a main event to invited and a custom event to not invited, so a wedding
 * where nobody has ever opened the per-event control still reports its real
 * ceremony and reception numbers rather than zeros.
 */

import { getWeddingEvents, getGuestEventResponse } from './weddingEvents.js';

/**
 * @param {object} wedding
 * @param {Array}  guests
 * @returns {Array<{event_id, name, isMain, invited, replied, yes, no}>}
 *   One entry per event, in the wedding's own chronological order.
 */
export function tallyEventsForGuests(wedding, guests = []) {
  const list = Array.isArray(guests) ? guests.filter(Boolean) : [];
  return getWeddingEvents(wedding).map((ev) => {
    let invited = 0, yes = 0, no = 0;
    for (const g of list) {
      const r = getGuestEventResponse(g, ev);
      if (!r.invited) continue;
      invited += 1;
      if (r.status === 'yes') yes += 1;
      else if (r.status === 'no') no += 1;
    }
    return { event_id: ev.event_id, name: ev.name, isMain: ev.isMain, invited, replied: yes + no, yes, no };
  });
}

/**
 * The owner's copy for a per-event count, in one place so the Guests page, the
 * daily update and anything after them cannot word it differently.
 *
 * "{n} invited, {m} replied", verbatim from the goal's copy block.
 */
export function eventCountLine({ invited, replied }) {
  return `${invited} invited, ${replied} replied`;
}

/**
 * WHETHER THE PER-EVENT BREAKDOWN IS WORTH SHOWING AT ALL.
 *
 * Every wedding has a ceremony and a reception, so "more than one event" is
 * always true and is the wrong test: a couple who has never used the control
 * would get a breakdown of two identical numbers. It is worth showing when the
 * events actually differ, which is either a custom event existing or the
 * invited counts not all being equal.
 */
export function tallyIsInformative(tallies = []) {
  if (tallies.length < 2) return false;
  if (tallies.some((t) => !t.isMain)) return true;
  return new Set(tallies.map((t) => t.invited)).size > 1;
}
