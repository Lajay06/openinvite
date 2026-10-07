/**
 * tests/persistence/per-event-fixtures.mjs
 *
 * THE FIXTURES PER-EVENT INVITATIONS ARE MEASURED AGAINST.
 *
 * Every guest in the render seed carried `event_responses: []`, which resolves
 * to "invited to both main events, invited to no custom event" for all four of
 * them. Nothing per-event could be rendered from that, because there was no
 * difference between any two guests to render. Item 6 of the goal names the
 * shape instead:
 *
 *   render fixture      one guest not invited to the reception, one not
 *                       invited to the Welcome drinks, the rest invited to all
 *   published fixture   one custom event with one guest removed from it
 *
 * A fixture is only worth having if something holds it to the thing it claims
 * to be, and that is what this file is. Three kinds of check:
 *
 *   THE SHAPE          the seed says what the goal says, in the form the
 *                      product actually writes (full resolved sets)
 *   THE INVARIANT      PUBLISHED_WEDDING.publicEventIds is pinned rather than
 *                      derived, so the rule is restated here and recomputed
 *                      from PUBLISHED_GUESTS. The two must agree, and the
 *                      recomputation is held against a second shape of the
 *                      same guest list with its per-event rows stripped, so
 *                      the literal is a consequence of the REMOVAL and not of
 *                      the custom event merely existing.
 *   THE BLAST RADIUS   the assumptions 48 existing browser guards already make
 *                      about this seed are still true, named one at a time, so
 *                      a later fixture edit that breaks one says which
 *
 * SOME OF ITEM 6'S GUARDS ARE NOT HERE, and that is recorded rather than
 * quietly dropped. The claims about the Guests page's chips, the send step, the
 * per-event counts strip and the guest site's filtering are claims about user
 * interfaces that ship in their own PRs for items 1, 2, 3 and 5. A guard
 * asserting them on main would be red on main. The fixtures they need are
 * here, which is the half that can land first.
 */

import { pass, fail } from './_shared.mjs';
import {
  SEED, PUBLISHED_WEDDING, PUBLISHED_GUESTS, PER_EVENT_GUEST, PER_EVENT_TOKEN,
  RSVP_GUEST, RSVP_TOKEN,
} from '../../scripts/lib/renderHarness.mjs';
import { getWeddingEvents, getGuestEventResponse, RECEPTION_EVENT_ID, MAIN_CEREMONY_EVENT_ID }
  from '../../src/lib/weddingEvents.js';
import { leadOf, salutation, counts as householdCounts } from '../../src/lib/household.js';
import { householdCountLine } from '../../src/lib/eventTallies.js';

const WELCOME = 'welcome-drinks';

export async function runPerEventFixtures() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const seedWedding = SEED.WeddingDetails[0];
  const seedEvents = getWeddingEvents(seedWedding);
  const invitedTo = (guest, events) =>
    events.filter((ev) => getGuestEventResponse(guest, ev).invited).map((ev) => ev.event_id);
  const byId = (list, id) => list.find((g) => g.id === id);

  // ── THE RENDER FIXTURE ──────────────────────────────────────────────────

  check('the seeded wedding has three events, so there is something to filter',
        seedEvents.map((e) => e.event_id), [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID, WELCOME]);

  ok('the custom event carries an explicit event_id, not one borrowed from `id`',
     seedWedding.preWeddingEvents.every((e) => !!e.event_id),
     seedWedding.preWeddingEvents.map((e) => e.event_id).join(', '));

  ok('every seeded guest carries a FULL resolved set, which is what the product writes',
     SEED.Guest.every((g) => Array.isArray(g.event_responses)
       && g.event_responses.length === seedEvents.length
       && seedEvents.every((ev) => g.event_responses.some((r) => r.event_id === ev.event_id))),
     `${seedEvents.length} entries on each of ${SEED.Guest.length} guests`);

  check('one guest is not invited to the Welcome drinks, by a stated removal',
        invitedTo(byId(SEED.Guest, 'g3'), seedEvents), [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID]);
  ok('  and it is a stored false, not an absent entry a default would answer',
     byId(SEED.Guest, 'g3').event_responses.some((r) => r.event_id === WELCOME && r.invited === false),
     'invited: false, stored');

  check('one guest is not invited to the reception',
        invitedTo(byId(SEED.Guest, 'g4'), seedEvents), [MAIN_CEREMONY_EVENT_ID, WELCOME]);
  ok('  and it is the declined guest with no table, so Seating\'s pool is untouched',
     byId(SEED.Guest, 'g4').rsvp_status === 'declined' && !byId(SEED.Guest, 'g4').table_assignment,
     'declined, unseated');

  check('two guests are invited to all three',
        ['g1', 'g2'].map((id) => invitedTo(byId(SEED.Guest, id), seedEvents).length), [3, 3]);

  const counts = seedEvents.map((ev) => SEED.Guest.filter((g) => getGuestEventResponse(g, ev).invited).length);
  // 8/7/3 since item 8 of goals/2026-10-07-households-and-children.md seeded a
  // household of three and a child of her own. Before: 4/3/3. The welcome
  // drinks did not move, because all four new rows carry a stored false for it
  // and the event was already removed by g3.
  check('the per-event counts differ, which is what makes a breakdown worth rendering',
        counts, [8, 7, 3]);

  // ── THE PUBLISHED FIXTURE, AND ITS INVARIANT ────────────────────────────

  const pubEvents = getWeddingEvents(PUBLISHED_WEDDING);
  check('the published wedding has a custom event too',
        pubEvents.map((e) => e.event_id), [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID, WELCOME]);

  // THE RULE, RESTATED: an event is public unless at least one guest carries an
  // explicit invited:false for it. Advisor ruling, 2026-10-06. It replaced
  // "public when every guest is invited", which this file used to restate, and
  // the difference is the whole point of the ruling: an absent row is not a
  // removal, so an untouched custom event stays public.
  //
  // Recomputed here rather than imported, because the resolver ships in its
  // own PR and this fixture has to load on main. If they ever disagree, the
  // literal is the one that is wrong.
  const removedFrom = (guest, eventId) => (guest?.event_responses || [])
    .some((r) => r?.event_id === eventId && r.invited === false);
  const publicUnder = (guests) => pubEvents
    .filter((ev) => !guests.some((g) => removedFrom(g, ev.event_id)))
    .map((ev) => ev.event_id);

  check('the pinned public set is exactly what the rule computes from the guest list',
        PUBLISHED_WEDDING.publicEventIds, publicUnder(PUBLISHED_GUESTS));

  check('  so the custom event is not public, because a guest was removed from it',
        PUBLISHED_WEDDING.publicEventIds.includes(WELCOME), false);
  check('  and both main events are, because nobody was removed from either',
        [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID].every((id) => PUBLISHED_WEDDING.publicEventIds.includes(id)),
        true);

  ok('exactly one published guest is removed from the custom event, as the goal asks',
     PUBLISHED_GUESTS.filter((g) => removedFrom(g, WELCOME)).length === 1, '1 of 2');

  // THE OTHER SHAPE THE RULING NAMES, held against the same fixture: strip the
  // per-event rows and the custom event must come back. This is the state every
  // already published wedding with a pre-wedding event is in, and the pinned
  // literal has to be a consequence of the REMOVAL and not of the custom event
  // merely existing.
  check('the same wedding with no per-event rows on any guest keeps the custom event public',
        publicUnder(PUBLISHED_GUESTS.map((g) => ({ ...g, event_responses: [] }))),
        [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID, WELCOME]);

  check('  and so does inviting some to it while leaving the rest untouched',
        publicUnder([
          { id: 'x', event_responses: [{ event_id: WELCOME, invited: true }] },
          { id: 'y', event_responses: [] },
        ]),
        [MAIN_CEREMONY_EVENT_ID, RECEPTION_EVENT_ID, WELCOME]);

  // ── THE PERSONAL LINK ───────────────────────────────────────────────────

  check('the per-event guest sees the custom event the public site hides',
        invitedTo(PER_EVENT_GUEST, pubEvents), [MAIN_CEREMONY_EVENT_ID, WELCOME]);
  ok('  so her link proves both halves at once: one event revealed, one withheld',
     invitedTo(PER_EVENT_GUEST, pubEvents).includes(WELCOME)
     && !invitedTo(PER_EVENT_GUEST, pubEvents).includes(RECEPTION_EVENT_ID),
     'welcome drinks shown, reception withheld');
  ok('  and her token is distinct from the one every other pass uses',
     PER_EVENT_TOKEN !== RSVP_TOKEN && !!PER_EVENT_TOKEN, PER_EVENT_TOKEN);

  // ── THE BLAST RADIUS, NAMED ─────────────────────────────────────────────

  ok('RSVP_GUEST still carries an empty set, which every /rsvp pass depends on',
     Array.isArray(RSVP_GUEST.event_responses) && RSVP_GUEST.event_responses.length === 0,
     'unchanged, and its own comment says why');
  ok('  and it therefore still resolves to both main events, so the RSVP cards render',
     invitedTo(RSVP_GUEST, pubEvents).length === 2, 'ceremony + reception');

  ok('every seeded guest is still invited to the ceremony, so no page loses its whole list',
     SEED.Guest.every((g) => getGuestEventResponse(g, seedEvents[0]).invited),
     `${SEED.Guest.length} of ${SEED.Guest.length}`);

  ok("the reception is still public, so the legacy dress-code string still renders",
     PUBLISHED_WEDDING.publicEventIds.includes(RECEPTION_EVENT_ID)
     && !!PUBLISHED_WEDDING.reception?.dressCode,
     `public, and "${PUBLISHED_WEDDING.reception?.dressCode}" lives only there`);

  ok('the seated, attending guests are both still invited to the reception',
     ['g1', 'g2'].every((id) => getGuestEventResponse(byId(SEED.Guest, id), { event_id: RECEPTION_EVENT_ID, isMain: true }).invited),
     "Seating's pool is unchanged");

  // ── THE HOUSEHOLD FIXTURE, AND THE CHILD WITHOUT AN AGE ─────────────────
  //
  // Item 8 of goals/2026-10-07-households-and-children.md. The same reasoning
  // as every check above: a fixture is only worth having if something holds it
  // to the thing it claims to be.

  const house = SEED.Guest.filter((g) => g.household_id === 'hh1');
  check('one household of three is seeded', house.map((g) => g.name),
        ['Priya Patel', 'Dev Patel', 'Mina Patel']);
  check('  and its lead is the member with an email, who is NOT its earliest row',
        [leadOf(house).name, house.slice().sort((a, b) => (a.created_date < b.created_date ? -1 : 1))[0].name],
        ['Priya Patel', 'Dev Patel']);
  check('  so the salutation is the two adults', salutation(house), 'Priya and Dev');
  check('  the child has an age, which only the couple ever sees',
        house.filter((g) => g.is_child).map((g) => g.child_age), [6]);
  ok('  and one more child is seeded with no age at all, which the goal asks for by name',
     SEED.Guest.some((g) => g.is_child && !g.household_id && g.child_age === undefined),
     'Theo Vale');
  check('the four numbers the goal is about', householdCounts(SEED.Guest),
        { people: 8, adults: 6, children: 2, invitations: 6 });
  check('  which is the sentence Ava is given',
        householdCountLine(SEED.Guest),
        '8 people across 6 invitations, of whom 6 adults and 2 children');
  // NOBODY NEW IS REMOVED FROM A MAIN EVENT, which is what keeps the reception
  // public and the dress-code and guest-site guards green.
  ok('no seeded guest carries a removal from a main event other than the one that always did',
     SEED.Guest.filter((g) => g.event_responses.some((r) => r.invited === false
       && (r.event_id === MAIN_CEREMONY_EVENT_ID || r.event_id === RECEPTION_EVENT_ID)))
       .map((g) => g.id).join(', ') === 'g4', 'g4 only');

  return results;
}
