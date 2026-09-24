/**
 * Seating counts the same people the guest list does.
 *
 * THE SYMPTOM. Seating's summary read 12 tables, 120 seats, 0 guests,
 * 0 assigned, 0 unassigned, beside a guest list holding 244.
 *
 * THE CAUSE, and it is not two data sources. Both pages load guests through
 * getMyGuestsWithRsvp. Seating then narrows to one event —
 * `response.invited && (yes|pending)` — using getGuestEventResponse, whose
 * fallback read `invited: hasAnyResponses ? false : event.isMain`. That
 * conflates "this guest has answered something, somewhere" with "this guest
 * was left off the wedding day": one entry for one pre-wedding event made the
 * responses array non-empty, and every event without its own entry — the
 * ceremony and the reception included — then resolved to invited: false.
 * Tables and seats kept counting because they are read off Table rows, which
 * is exactly the shape of the reported numbers.
 *
 * THE RULE NOW. Being at the wedding is the baseline; a pre-wedding event is
 * the opt-in. An absent entry means invited for a main event and not invited
 * for the rest. An explicit entry still wins over both, so a guest the couple
 * actually removed from the ceremony stays removed.
 *
 * WHAT THIS CHANGES BEYOND SEATING, said plainly because the function is
 * shared: anything that asks "is this guest invited to this event" and finds
 * no entry now gets true for a main event where it used to get false — the
 * guest list's event chips, the RSVP form's invited-events list, attendee
 * counts. That is the intended correction, not a side effect, but it is a
 * behaviour change on a guest-facing surface and is called out in the PR.
 */
import { pass, fail } from './_shared.mjs';
import { getGuestEventResponse } from '../../src/lib/weddingEvents.js';

const CEREMONY = { event_id: 'ceremony', isMain: true };
const RECEPTION = { event_id: 'reception', isMain: true };
const WELCOME = { event_id: 'welcome-drinks', isMain: false };

export async function runSeatingSeesTheGuestList() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Seating counts the same people the guest list does:\n');

  // The guest at the heart of the report: answered for one pre-wedding event,
  // nothing for the wedding day.
  const partial = { id: 'g1', name: 'Ada', event_responses: [
    { event_id: 'welcome-drinks', invited: true, status: 'yes', plus_ones: 0 },
  ] };
  check('a guest with a pre-wedding answer is still invited to the ceremony',
    getGuestEventResponse(partial, CEREMONY).invited === true, 'invited');
  check('  and to the reception', getGuestEventResponse(partial, RECEPTION).invited === true, 'invited');
  check('  and is still counted by seating (invited and pending)',
    (() => { const r = getGuestEventResponse(partial, CEREMONY); return r.invited && (r.status === 'yes' || r.status === 'pending'); })(),
    'in the pool');

  // A guest with no answers at all was already right; it must stay right.
  const fresh = { id: 'g2', name: 'Alan', event_responses: [] };
  check('a guest with no answers is invited to a main event',
    getGuestEventResponse(fresh, CEREMONY).invited === true, 'invited');
  check('  and not to a pre-wedding one', getGuestEventResponse(fresh, WELCOME).invited === false, 'not invited');

  // An explicit entry still decides, in both directions.
  const removed = { id: 'g3', name: 'Removed', event_responses: [
    { event_id: 'ceremony', invited: false, status: 'pending', plus_ones: 0 },
  ] };
  check('an explicit removal from a main event is honoured',
    getGuestEventResponse(removed, CEREMONY).invited === false, 'stays removed');
  const added = { id: 'g4', name: 'Added', event_responses: [
    { event_id: 'welcome-drinks', invited: true, status: 'yes', plus_ones: 0 },
  ] };
  check('  and an explicit invite to a pre-wedding event is honoured',
    getGuestEventResponse(added, WELCOME).invited === true, 'stays invited');

  // The whole-list property the owner asked for: everyone on the guest list
  // counts at a main event unless they were explicitly removed from it.
  const list = [partial, fresh, removed, added];
  const atCeremony = list.filter((g) => getGuestEventResponse(g, CEREMONY).invited).length;
  check('every guest counts at a main event except those explicitly removed',
    atCeremony === list.length - 1, `${atCeremony} of ${list.length}, one explicitly removed`);

  // unassigned = guests - assigned, on that same population.
  const assigned = new Set(['g1']);
  const unassigned = list.filter((g) => getGuestEventResponse(g, CEREMONY).invited && !assigned.has(g.id)).length;
  check('  unassigned is that count minus the assigned',
    unassigned === atCeremony - assigned.size, `${atCeremony} - ${assigned.size} = ${unassigned}`);

  return results;
}
