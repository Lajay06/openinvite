/**
 * src/lib/professionalFeedClient.js
 *
 * WHERE A LINKED EVENT'S GUESTS COME FROM, ON THE CLIENT.
 *
 * Live, this asks the server (api/professional/feed.js) and shows exactly what
 * comes back: the server builds the response from the allowlist in
 * api/_lib/professionalFeed.js and nothing else.
 *
 * Until the entities exist (STORE_LIVE false), a linked event's feed is built
 * from a small set of fictional couple rows, through that SAME allowlist
 * module, so the screens show what a planner will really receive and nothing
 * the server would not send. The fictional rows are deliberately loaded with
 * contact fields, so a leak would show on screen.
 */
import { buildLinkedFeed, frozenTotals } from '../../api/_lib/professionalFeed.js';
import { STORE_LIVE } from './professionalStore';

const DEMO_COUPLE = {
  ev_1: {
    wedding: { weddingDate: '', venueName: 'The Glasshouse, Napa', ceremonyTime: '4:00 pm' },
    guests: [
      ['Ava Chen', 'attending', 'Salmon', 'Table 1', '', true, 'Leo Chen'],
      ['Leo Chen', 'attending', 'Beef', 'Table 1', 'Shellfish allergy'],
      ['Nina Patel', 'attending', 'Risotto', 'Table 2', 'Vegetarian'],
      ['Omar Haddad', 'attending', 'Beef', 'Table 2', ''],
      ['Rosa Diaz', 'attending', 'Salmon', 'Table 3', 'Gluten free'],
      ['Sam Diaz', 'attending', 'Kids pasta', 'Table 3', 'Nut allergy', false, '', true],
      ['Iris Moore', 'declined', '', '', ''],
      ['Jack Moore', 'declined', '', '', ''],
      ['Tess Wong', 'pending', '', '', ''],
      ['Hugo Lam', 'pending', '', '', ''],
      ['Mei Lam', 'maybe', '', '', ''],
      ['Pia Rossi', 'attending', 'Risotto', 'Table 4', 'Vegan'],
    ],
    schedule: [
      { time: '3:30 pm', title: 'Guests arrive', location: 'Terrace' },
      { time: '4:00 pm', title: 'Ceremony', location: 'Garden lawn' },
      { time: '6:30 pm', title: 'Our entrance', location: 'Glasshouse' },
      { time: '9:00 pm', title: 'First dance', location: 'Glasshouse' },
    ],
  },
};

function demoGuests(list) {
  return list.map(([name, rsvp_status, meal_label, table_assignment, dietary_restrictions, plus_one = false, plus_one_name = '', is_child = false], i) => ({
    // Contact fields on purpose: the allowlist must drop them before they reach a screen.
    id: `demo_guest_${i}`, email: `guest${i}@example.com`, phone: '+1 415 555 0100', mailing_address: '1 Main St',
    name, rsvp_status, meal_label, table_assignment, dietary_restrictions, plus_one, plus_one_name, is_child,
  }));
}

/** The feed for a linked event, or null for a standalone or unlinked one. */
export function linkedFeedFor(event, store) {
  if (!event || event.kind !== 'linked') return null;
  if (STORE_LIVE) return (store.__feeds || {})[event.id] || null;
  // Any linked test event borrows the one fictional couple's list.
  const demo = DEMO_COUPLE[event.id] || DEMO_COUPLE.ev_1;
  const linkRows = (store.PlannerLink || []).filter((l) => l.event_id === event.id);
  return buildLinkedFeed({
    linkRows,
    guests: demoGuests(demo.guests),
    wedding: { ...demo.wedding, weddingDate: event.event_date },
    extras: { schedule: demo.schedule },
  });
}

/** After an unlink, the planner keeps only the last totals. */
export function frozenFor(event) {
  return event?.frozen_totals || null;
}
export { frozenTotals };
