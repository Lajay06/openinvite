/**
 * tests/persistence/event-dimension-in-context.mjs
 *
 * THE EVENT DIMENSION, WHERE THE COUPLE AND AVA READ THE NUMBERS.
 *
 * Both reported the wedding as one thing: invitations sent, invitations
 * pending, people coming. For a wedding with 500 at the ceremony and 300 at
 * the reception that is an average of two different questions, and "61 still
 * to reply" does not say which event is waiting. Asked "who is coming to the
 * welcome drinks", Ava had nothing to answer from and answered about the
 * wedding instead, which is worse than saying she does not know. Every number
 * either of them needed was already on Guest.event_responses.
 *
 * The tally is pure (src/lib/eventTallies.js) and so is the context string
 * (avaContextFormat.js, split out for exactly this reason), so almost
 * everything here is driven rather than scanned.
 *
 * COUNTED PER INVITATION. One guest row is one invitation whatever its
 * plus-ones, because event_responses lives on the guest record and a plus-one
 * travels with it. The owner's 94-versus-61 ruling, applied per event, and the
 * block of context Ava gets says so in those words so she cannot mix them.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { tallyEventsForGuests, eventCountLine, tallyIsInformative } from '../../src/lib/eventTallies.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const WEDDING = {
  weddingDate: '2027-06-12',
  mainCeremony: { startTime: '14:00', venueName: 'St Mary' },
  reception:    { startTime: '18:00', venueName: 'The Hall' },
  preWeddingEvents: [{ event_id: 'wd', name: 'Welcome drinks', date: '2027-06-10' }],
};
const GUESTS = [
  { id: 'a', name: 'Ada', rsvp_status: 'attending', event_responses: [
    { event_id: 'main-ceremony', invited: true, status: 'yes' },
    { event_id: 'reception',     invited: true, status: 'yes' },
    { event_id: 'wd',            invited: true, status: 'yes' },
  ] },
  { id: 'b', name: 'Grace', rsvp_status: 'pending', event_responses: [] },
  { id: 'c', name: 'Alan', rsvp_status: 'declined', event_responses: [
    { event_id: 'main-ceremony', invited: true,  status: 'no' },
    { event_id: 'reception',     invited: false, status: 'pending' },
  ] },
];

export async function runEventDimensionInContext() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE TALLY ───────────────────────────────────────────────────────────

  const t = tallyEventsForGuests(WEDDING, GUESTS);
  check('one row per event, in the wedding order', t.map((r) => r.name),
        ['Ceremony', 'Reception', 'Welcome drinks']);
  check('  the ceremony counts the guest with no entries at all, because it defaults invited',
        [t[0].invited, t[0].replied, t[0].yes, t[0].no], [3, 2, 1, 1]);
  check('  the reception does not count the guest removed from it',
        [t[1].invited, t[1].replied], [2, 1]);
  check('  a custom event counts only the guests added to it',
        [t[2].invited, t[2].replied], [1, 1]);
  check('  invited-but-pending is invited and has not replied',
        [t[1].yes, t[1].no], [1, 0]);
  check('no guests at all is zeros, not an empty list of events',
        tallyEventsForGuests(WEDDING, []).map((r) => r.invited), [0, 0, 0]);

  check("the count line is the owner's copy, verbatim",
        eventCountLine({ invited: 40, replied: 12 }), '40 invited, 12 replied');

  ok('the breakdown is shown when a custom event exists', tallyIsInformative(t), 'informative');
  ok('  and when a main event has had someone removed',
     tallyIsInformative(tallyEventsForGuests({ mainCeremony: {}, reception: {} }, GUESTS)), 'informative');
  ok('  but not on a wedding where every event has the same people',
     !tallyIsInformative(tallyEventsForGuests({ mainCeremony: {}, reception: {} },
       [{ id: 'x', event_responses: [] }, { id: 'y', event_responses: [] }])),
     'two identical numbers are not a breakdown');

  // ── AVA'S CONTEXT, DRIVEN ───────────────────────────────────────────────

  // formatWeddingContext reads localStorage for a couple-name fallback.
  if (typeof globalThis.localStorage === 'undefined') {
    globalThis.localStorage = { getItem: () => null };
  }
  const { formatWeddingContext } = await import('../../src/lib/avaContextFormat.js');
  const ctx = formatWeddingContext({ guests: GUESTS, wd: WEDDING, user: { full_name: 'A', email: 'a@b.c' } });

  ok('Ava is given an EVENTS block', /\nEVENTS\. REPLIES ARE COUNTED PER INVITATION/.test(ctx), 'present');
  ok('  numbered, so a guest line can name events without repeating them',
     /\[1\] Ceremony: 3 invited, 2 replied \(1 yes, 1 no\)/.test(ctx)
     && /\[3\] Welcome drinks: 1 invited, 1 replied/.test(ctx), 'numbered and counted');
  ok('  and told how a guest is invited by default, so she does not guess',
     /invited to a main event unless the couple removed them/.test(ctx), 'the defaulting rule, stated');
  ok("  it sits before the guest list, which refers back to it",
     ctx.indexOf('EVENTS. REPLIES') < ctx.indexOf('GUEST LIST')
     && /A guest line with no events note is invited to all of them\./.test(ctx), 'ordered');

  ok('a guest invited to everything carries no events note, so the usual wedding costs nothing',
     /\nAda \[id a\] — attending\n/.test(ctx), 'Ada, no note');
  ok('  a guest invited to some names exactly those', /\nGrace \[id b\] — pending, events 1,2\n/.test(ctx), 'Grace, 1,2');
  ok('  and a guest removed from one loses that number', /\nAlan \[id c\] — declined, events 1\n/.test(ctx), 'Alan, 1');

  const noneCtx = formatWeddingContext({
    guests: [{ id: 'z', name: 'Zed', rsvp_status: 'pending',
               event_responses: [{ event_id: 'main-ceremony', invited: false }, { event_id: 'reception', invited: false }] }],
    wd: WEDDING, user: {},
  });
  ok('a guest invited to nothing says so rather than showing an empty list',
     /Zed \[id z\] — pending, invited to no event/.test(noneCtx), 'said plainly');

  // ── THE DAILY UPDATE ────────────────────────────────────────────────────

  const page = fs.readFileSync(path.join(ROOT, 'src/pages/DailyUpdate.jsx'), 'utf8');
  const wiring = [
    ['the daily update tallies the same way, through the shared helper',
      /tallyEventsForGuests\(wd, guests\)/],
    ['  and shows the breakdown only when the events differ',
      /const showEventTallies = tallyIsInformative\(eventTallies\)/],
    ['  rendering the shared count line, not its own wording',
      /\{eventCountLine\(t\)\}/],
  ];

  // ── UNDER THE NUMBERS IT REFINES, AS AN ORDER AND NOT A DISTANCE ────────
  //
  // RE-POINTED 2026-10-07, households and children item 7. This was
  // `/snapCards\.map[\s\S]{0,1400}?data-per-event-counts/`, a character
  // distance, and item 7 added a "By household" strip between the tiles and
  // this one, which pushed the two markers 1400 characters apart. The property
  // never changed: the breakdown still sits inside the numbers column, under
  // the tiles. A distance was the wrong instrument, because any sibling added
  // between them breaks it while the thing it claims to check stays true.
  const tiles = page.indexOf('snapCards.map');
  const strip = page.indexOf('data-per-event-counts');
  const columnEnd = page.indexOf('</div>', strip);
  results.push(tiles > -1 && strip > tiles && columnEnd > strip
    ? pass('Daily update:   under the numbers it refines, not somewhere else on the page',
           `tiles at ${tiles}, strip at ${strip}`)
    : fail('Daily update:   under the numbers it refines, not somewhere else on the page',
           'the strip follows the tiles in the same column',
           `tiles ${tiles}, strip ${strip}`));
  for (const [label, re] of wiring) {
    results.push(re.test(page) ? pass(`Daily update: ${label}`, 'present')
                               : fail(`Daily update: ${label}`, 'present', 'the line is gone'));
  }

  return results;
}
