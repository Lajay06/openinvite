/**
 * tests/persistence/invite-email-lists-events.mjs
 *
 * THE INVITE LISTS EXACTLY THE EVENTS THAT GUEST IS INVITED TO.
 *
 * Item 6 of goals/2026-10-01-per-event-invitations.md asked for this guard and
 * it could not be written there: the behavior ships in #887, and a guard
 * asserting it on main before that merged would have been red on main. Landing
 * it now is item 2 of goals/2026-10-06-per-event-follow-up.md.
 *
 * WHAT COULD GO WRONG, AND WHY A GUARD RATHER THAN A READING. The event lines
 * on an invitation are assembled from two decisions in two different files:
 * SendInvitesModal.buildGuestEvents filters the wedding's events down to the
 * ones this guest is invited to, and renderInvitationEmail decides whether to
 * print them at all. Either half can be correct while the pair is wrong, and
 * the failure is silent in the worst way: an invitation that tells a guest
 * about a party they are not going to, sent to hundreds of people at once,
 * discovered by a reply.
 *
 * THE RENDERER IS PURE, so this drives it directly. The filtering half is a
 * component, so the same filter is reproduced here from the one shared
 * resolver and the component is checked to use that resolver and nothing else.
 *
 * NAME AND DATE ONLY, which is a ruling and not an omission: "Venue and
 * schedule stay the site's to reveal, as the template comment says."
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { renderInvitationEmail } from '../../src/lib/emailTemplate.js';
import { getWeddingEvents, getGuestEventResponse } from '../../src/lib/weddingEvents.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

const WEDDING = {
  weddingDate: '2027-06-12',
  mainCeremony: { startTime: '14:00', venueName: 'St Mary' },
  reception:    { startTime: '18:00', venueName: 'The Long Room' },
  preWeddingEvents: [
    { event_id: 'welcome_drinks', name: 'Welcome drinks', date: '2027-06-10', startTime: '18:00', venueName: 'The Tavern' },
  ],
};
const ONE_EVENT_WEDDING = { weddingDate: '2027-06-12', mainCeremony: { startTime: '14:00', venueName: 'St Mary' } };

/** The component's own filter, from the same resolver it uses. */
const guestEvents = (wedding, guest, restrictEventIds = null) =>
  getWeddingEvents(wedding)
    .filter((ev) => getGuestEventResponse(guest, ev).invited)
    .filter((ev) => !restrictEventIds || restrictEventIds.includes(ev.event_id))
    .map((ev) => ({ name: ev.name, date: ev.date, startTime: ev.startTime, venue: ev.venue }));

const render = (events) => renderInvitationEmail({
  universeId: 'london', type: 'invite', guestName: 'Grace', coupleNames: 'Ada & Alan',
  events, rsvpUrl: 'https://example.com/r/x', siteUrl: 'https://example.com/w/x',
  weddingDate: WEDDING.weddingDate,
});

/** Which of the three event names the rendered mail actually names. */
const named = (out) => ['Ceremony', 'Reception', 'Welcome drinks']
  .filter((n) => out.html.includes(n) || out.text.includes(n));

export async function runInviteEmailListsEvents() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE GUEST'S OWN EVENTS, AND NOBODY ELSE'S ───────────────────────────

  const invitedToAll = { id: 'a', event_responses: [{ event_id: 'welcome_drinks', invited: true }] };
  check('a guest invited to everything is told about everything',
        named(render(guestEvents(WEDDING, invitedToAll))),
        ['Ceremony', 'Reception', 'Welcome drinks']);

  const untouched = { id: 'b', event_responses: [] };
  check('a guest with no per-event rows is told about the two main events only',
        named(render(guestEvents(WEDDING, untouched))),
        ['Ceremony', 'Reception']);

  const removed = { id: 'c', event_responses: [{ event_id: 'reception', invited: false }] };
  check('a guest removed from the reception is never told about the reception',
        named(render(guestEvents(WEDDING, removed))).includes('Reception'), false);

  // ── ONE EVENT MEANS NO LIST, AND THAT IS WORTH PINNING ──────────────────
  //
  // The renderer prints the event lines only when the guest has MORE THAN ONE
  // (showEventsWhenSeveral), which is the shipped rule from #887: "With one
  // event, the invite is unchanged." Two consequences follow, and both are
  // asserted rather than discovered later:
  //
  //   a guest down to one event names nothing. The guest removed from the
  //   reception above is left with the ceremony alone, so their invite carries
  //   no event line at all.
  //
  //   a send RESTRICTED to one event names nothing either. An invitation sent
  //   for the welcome drinks does not contain the words "Welcome drinks".
  //
  // That second one is a real gap in the product rather than a fact about this
  // guard, and it is reported in the PR for the owner. It is NOT changed here:
  // this item lands guards, and the behavior belongs to its own ruling.
  check('a guest down to one event gets no event list at all',
        named(render(guestEvents(WEDDING, removed))), []);

  check('a send restricted to one event names nothing, which is the shipped rule',
        named(render(guestEvents(WEDDING, invitedToAll, ['welcome_drinks']))), []);

  // AND THERE IS NO SUCH THING AS A ONE-EVENT WEDDING, which is the finding
  // this case exists to record. getWeddingEvents ALWAYS returns a ceremony and
  // a reception, because this product treats both as structure rather than as
  // optional events (weddingEvents.js:42-60), so a record with nothing at all
  // in `reception` still yields two. The goal's "with one event, the invite is
  // unchanged" therefore has no ordinary wedding to apply to: every invite
  // gained two event lines. #887 said so in its own comment; this pins it, so
  // nobody reads the goal sentence later and believes the common case was left
  // alone.
  check('a record with no reception data still yields two events, so the lines appear anyway',
        named(render(guestEvents(ONE_EVENT_WEDDING, untouched))),
        ['Ceremony', 'Reception']);

  check('  the floor is the resolver, not the renderer',
        getWeddingEvents(ONE_EVENT_WEDDING).map((e) => e.event_id),
        ['main-ceremony', 'reception']);

  const two = render(guestEvents(WEDDING, untouched));
  ok('two or more and the lines appear',
     two.html.includes('Ceremony') && two.html.includes('Reception'), 'two lines');

  // ── NAME AND DATE ONLY ──────────────────────────────────────────────────
  //
  // The venue is the site's to reveal. A venue leaking into the invite is not
  // a cosmetic slip: it is the one decision the template comment calls out.
  // VENUES PUT IN BY HAND, because the pipeline never supplies one and that is
  // itself a finding. getWeddingEvents does NOT set `venue` on any event, so
  // buildGuestEvents' `venue: ev.venue` is always undefined and the renderer's
  // `ev.venue && cfg.showEvents` gate has nothing to suppress. The first draft
  // of this check passed an empty venue to a gate and proved nothing: it stayed
  // green with the gate deleted. These events carry venues so the gate is
  // actually exercised, and the pipeline's own silence is pinned below.
  const withVenues = render(guestEvents(WEDDING, invitedToAll).map((e, i) =>
    ({ ...e, venue: ['St Mary', 'The Long Room', 'The Tavern'][i] })));
  const leaked = ['St Mary', 'The Long Room', 'The Tavern'].filter((v) =>
    withVenues.html.includes(v) || withVenues.text.includes(v));
  check('no venue reaches the invite even when one is supplied, in either half', leaked, []);

  check('and the pipeline supplies none anyway, so the gate is a second line of defense',
        getWeddingEvents(WEDDING).map((ev) => ev.venue), [undefined, undefined, undefined]);

  ok('the date does', /June/.test(withVenues.html) || /2027/.test(withVenues.html), 'date present');

  ok('the plain-text half lists the same events as the html half',
     ['Ceremony', 'Reception', 'Welcome drinks'].every((n) => withVenues.text.includes(n)),
     'both halves agree');

  // ── THE FILTER IS THE SHARED RESOLVER, NOT A SECOND OPINION ─────────────

  const modal = fs.readFileSync(path.join(ROOT, 'src/components/guests/SendInvitesModal.jsx'), 'utf8');
  ok('buildGuestEvents filters through getGuestEventResponse',
     /const buildGuestEvents = \(guest\) => weddingEvents[\s\S]{0,120}?getGuestEventResponse\(guest, ev\)\.invited/.test(modal),
     'one resolver');
  ok('  and narrows again by the chosen event',
     /!restrictEventIds \|\| restrictEventIds\.includes\(ev\.event_id\)/.test(modal), 'restrictEventIds');
  ok('  and carries name, date and time, with venue left for the renderer to drop',
     /\.map\(ev => \(\{ name: ev\.name, date: ev\.date, startTime: ev\.startTime, venue: ev\.venue \}\)\)/.test(modal),
     'four fields out');

  const tmpl = fs.readFileSync(path.join(ROOT, 'src/lib/emailTemplate.js'), 'utf8');
  ok('the renderer prints the lines only when the guest has several events',
     /const showEventsHere = cfg\.showEvents \|\| \(cfg\.showEventsWhenSeveral && events\.length > 1\)/.test(tmpl),
     'showEventsWhenSeveral');
  ok('  and suppresses the venue for the invite specifically',
     /ev\.venue && cfg\.showEvents/.test(tmpl), 'venue gated on showEvents');

  return results;
}
