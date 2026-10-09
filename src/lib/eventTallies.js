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
import { counts as householdCounts } from './household.js';

/**
 * @param {object} wedding
 * @param {Array}  guests
 * @returns {Array<{event_id, name, isMain, invited, replied, yes, no}>}
 *   One entry per event, in the wedding's own chronological order.
 */
export function tallyEventsForGuests(wedding, guests = []) {
  const list = Array.isArray(guests) ? guests.filter(Boolean) : [];
  return getWeddingEvents(wedding).map((ev) => {
    // MAYBE IS A REPLY, and it is its own bucket rather than folded into
    // either side. Replied means answered, which is already this file's rule
    // for a no, and a maybe is an answer the couple recorded. It is counted
    // separately because adding it to yes would inflate the head count the
    // caterer reads.
    let invited = 0, yes = 0, no = 0, maybe = 0;
    for (const g of list) {
      const r = getGuestEventResponse(g, ev);
      if (!r.invited) continue;
      invited += 1;
      if (r.status === 'yes') yes += 1;
      else if (r.status === 'no') no += 1;
      else if (r.status === 'maybe') maybe += 1;
    }
    return { event_id: ev.event_id, name: ev.name, isMain: ev.isMain, invited,
             replied: yes + no + maybe, yes, no, maybe };
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
 * THE GUEST LIST'S FOUR NUMBERS, AS A SENTENCE.
 *
 * Item 7 of goals/2026-10-07-households-and-children.md asks that Ava carry
 * people, adults, children and invitations "through eventTallies.js". It is
 * routed here rather than imported straight into the context builder so there
 * is ONE module Ava's numbers about the guest list come from, next to the
 * per-event ones, and so nothing has to recompute them: src/lib/household.js
 * stays the only place that counts.
 *
 * ONE SENTENCE, NOT FOUR FIELDS, because the prompt is read by a model and a
 * line it can quote back is worth more than a struct it has to assemble.
 *
 * @param {Array} guests
 * @returns {string}
 */
export function householdCountLine(guests = []) {
  const c = householdCounts(guests);
  // PLURALISED, INCLUDING THE AWKWARD ONES. "1 adults" in a prompt is a model
  // reading a sentence nobody wrote, and "1 child" versus "1 children" is the
  // kind of detail it will reproduce in an answer to the couple.
  const n = (count, one, many) => `${count} ${count === 1 ? one : many}`;
  return `${n(c.people, 'person', 'people')} across ${n(c.invitations, 'invitation', 'invitations')}`
    + `, of whom ${n(c.adults, 'adult', 'adults')} and ${n(c.children, 'child', 'children')}`;
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
