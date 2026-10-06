/**
 * tests/persistence/guest-site-event-visibility.mjs
 *
 * WHO SEES WHICH EVENT ON THE PUBLISHED SITE.
 *
 * The celebration page and the styling quiz listed every event on the record
 * to every visitor. A wedding with 500 at the ceremony and 40 at the welcome
 * drinks therefore told all 500 about the welcome drinks, and the quiz offered
 * them as something to be dressed for. The RSVP form had read event_responses
 * since per-event RSVP shipped; the site never did.
 *
 * The rule has two halves and a failure mode, and all three are property
 * checks rather than renders, because the logic is pure
 * (src/lib/guestEventVisibility.js) and a browser adds nothing to the proof.
 *
 * Then four static checks, for the parts that are wiring rather than logic:
 * the server must compute the set and must not leak a guest field doing it,
 * and the two surfaces must actually ask.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { publicEventIds, visibleEventIds, visibleEvents } from '../../src/lib/guestEventVisibility.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);

/** A wedding with the two main events and one custom one. */
const WEDDING = {
  weddingDate: '2027-06-12',
  mainCeremony: { startTime: '14:00', venueName: 'St Mary' },
  reception:    { startTime: '18:00', venueName: 'The Hall' },
  preWeddingEvents: [{ event_id: 'welcome_drinks', name: 'Welcome drinks', date: '2027-06-10' }],
};
/** The same record as a guest payload: `locked` is what makes it one. */
const PAYLOAD = { ...WEDDING, locked: false, passwordProtected: false };

const g = (name, responses) => ({ id: name, name, event_responses: responses });

export async function runGuestSiteEventVisibility() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));

  // ── WITHOUT A LINK: WHAT IS PUBLIC ──────────────────────────────────────
  //
  // "NOBODY INVITED" IS NOT "REMOVED". Advisor ruling, 2026-10-06. An event is
  // hidden only when a guest carries an explicit invited:false for it; an
  // event with no per-event rows on anybody is as public as it was yesterday.
  //
  // These cases are written in pairs on purpose: for each shape, the state
  // that must stay public and the state that must hide, so the rule is pinned
  // from both sides rather than only from the side that happens to pass.

  check('a wedding with no guest list yet shows every event',
        publicEventIds(WEDDING, []), ['main-ceremony', 'reception', 'welcome_drinks']);

  // THE CASE THE RULING IS ABOUT, and the one the first rule got wrong. Every
  // published wedding with a pre-wedding event and no per-event invitations
  // set is this case, and its public page must not change.
  check('a custom event with no per-event rows on any guest stays public',
        publicEventIds(WEDDING, [g('A', []), g('B', [])]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  check('  still public when some guests have rows for OTHER events only',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'main-ceremony', invited: true }, { event_id: 'reception', invited: true }]),
          g('B', []),
        ]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  // Forty invited and the rest never touched. Under the superseded rule this
  // hid the event; under the ruling it does not, because nobody was removed.
  check('  and still public when some are invited to it and the rest are untouched',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', []),
        ]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  check('a custom event the whole list is invited to stays public',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', [{ event_id: 'welcome_drinks', invited: true }]),
        ]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  // THE LEAK CASE. One guest taken off, which is what "Remove from..." writes,
  // and the public page must hide it.
  check('one guest REMOVED from the custom event hides it from the public page',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', [{ event_id: 'welcome_drinks', invited: false }]),
        ]),
        ['main-ceremony', 'reception']);

  check('  one removal is enough, whatever the rest of the list says',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', [{ event_id: 'welcome_drinks', invited: true }]),
          g('C', [{ event_id: 'welcome_drinks', invited: false }]),
        ]),
        ['main-ceremony', 'reception']);

  check('a guest removed from the reception takes the reception off the public site',
        publicEventIds(WEDDING, [g('A', [{ event_id: 'reception', invited: false }])]),
        ['main-ceremony', 'welcome_drinks']);

  check('a main event nobody was explicitly set for is still public',
        publicEventIds(WEDDING, [g('A', []), g('B', [])]).slice(0, 2),
        ['main-ceremony', 'reception']);

  // === false, which is the ruling's own word. A row the product writes always
  // carries a real boolean, so this only decides what happens to a malformed
  // one: it is not a removal, and the event stays public, which is the
  // direction the ruling chose wherever the data does not clearly say
  // otherwise.
  check('a row with no invited key at all is not a removal',
        publicEventIds(WEDDING, [g('A', [{ event_id: 'welcome_drinks', status: 'pending' }])]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  check('  and neither is a row for a different event',
        publicEventIds(WEDDING, [g('A', [{ event_id: 'an_event_that_was_deleted', invited: false }])]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  // THE ASYMMETRY, PINNED RATHER THAN LEFT AMBIGUOUS. The ruling amended the
  // public half only, so a guest with no row for a public custom event does
  // not see it on their own link while a stranger does. Asserted here so the
  // behavior is a decision on the record and not a surprise, and raised in
  // #889 for a ruling of its own.
  {
    const guests = [g('A', [{ event_id: 'welcome_drinks', invited: true }]), g('B', [])];
    const pub = publicEventIds(WEDDING, guests);
    check('the public page shows a custom event that B\'s own link does not',
          [pub.includes('welcome_drinks'),
           visibleEventIds({ wedding: PAYLOAD, publicIds: pub, guest: guests[1] }).includes('welcome_drinks')],
          [true, false]);
  }

  // ── WITH A LINK: THE GUEST'S OWN SET ────────────────────────────────────

  check("a guest the link identifies sees their own events, not the public ones",
        visibleEventIds({ wedding: PAYLOAD, publicIds: ['main-ceremony'],
                          guest: g('A', [{ event_id: 'welcome_drinks', invited: true }]) }),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  check('a guest removed from the reception never sees it, public or not',
        visibleEventIds({ wedding: PAYLOAD, publicIds: ['main-ceremony', 'reception'],
                          guest: g('B', [{ event_id: 'reception', invited: false }]) }),
        ['main-ceremony']);

  check('the server set is intersected, so an id for an event that is gone cannot resurrect it',
        visibleEventIds({ wedding: PAYLOAD, publicIds: ['main-ceremony', 'deleted_event'] }),
        ['main-ceremony']);

  // ── THE TWO FAILURE SHAPES ──────────────────────────────────────────────

  check('a guest payload with no public set falls back to the main events only',
        visibleEventIds({ wedding: PAYLOAD }), ['main-ceremony', 'reception']);

  check("the couple's own record is not a guest payload, and shows everything",
        visibleEventIds({ wedding: WEDDING }), ['main-ceremony', 'reception', 'welcome_drinks']);

  check('visibleEvents returns the events themselves, in the wedding order',
        visibleEvents(PAYLOAD, { publicIds: ['welcome_drinks', 'main-ceremony'] }).map(e => e.name),
        ['Ceremony', 'Welcome drinks']);

  // ── THE WIRING ──────────────────────────────────────────────────────────

  const api = fs.readFileSync(path.join(ROOT, 'api/wedding-by-slug.js'), 'utf8');
  const wiring = [
    ['api/wedding-by-slug.js', api, 'the endpoint computes the public set from the guest list',
      /fetchPublicEventIds[\s\S]{0,900}?entities\/Guest\?q=/],
    ['api/wedding-by-slug.js', api, 'it reduces guest rows to event_responses before anything else',
      /\.map\(\(g\) => \(\{ event_responses:/],
    ['api/wedding-by-slug.js', api, 'the key is omitted rather than nulled when the read fails',
      /\.\.\.\(publicIds \? \{ publicEventIds: publicIds \} : \{\}\)/],
    ['src/components/guest-website/pages/WeddingCelebrationPage.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/pages/WeddingCelebrationPage.jsx'), 'utf8'),
      'the celebration page resolves the visible set for whoever is looking',
      /visibleEventIdSet\(\{[\s\S]{0,200}?guest: recognisedGuest/],
    ['src/components/guest-website/pages/WeddingCelebrationPage.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/pages/WeddingCelebrationPage.jsx'), 'utf8'),
      'and renders the filtered list rather than every event on the record',
      /allEvents\.filter\(\(ev\) => !ev\._eventId \|\| visibleIds\.has\(ev\._eventId\)\)[\s\S]{0,400}?visibleEvents\.sort\(/],
    ['src/components/guest-website/pages/WeddingStylePage.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/pages/WeddingStylePage.jsx'), 'utf8'),
      'the styling quiz asks only about events the visitor may see',
      /visibleEvents\(weddingDetails, \{[\s\S]{0,120}?guest: recognisedGuest/],
    ['src/components/guest-website/pages/WeddingStylePage.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/pages/WeddingStylePage.jsx'), 'utf8'),
      'and a known guest is not asked a question their invitations answer',
      /attendingIds === null && events\.length > 1 && !guestKnown \?/],
    ['src/components/guest-website/MultiPageWeddingWebsite.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/MultiPageWeddingWebsite.jsx'), 'utf8'),
      'the whole guest record is kept, not just the greeting name',
      /setRecognisedGuest\(data\?\.guest \|\| null\)/],
    ['src/components/guest-website/MultiPageWeddingWebsite.jsx',
      fs.readFileSync(path.join(ROOT, 'src/components/guest-website/MultiPageWeddingWebsite.jsx'), 'utf8'),
      'and it reaches the page component',
      /recognisedGuest=\{recognisedGuest\}/],
  ];
  for (const [file, text, label, re] of wiring) {
    results.push(re.test(text)
      ? pass(`${label}`, file)
      : fail(`${label}`, file, 'the wiring is gone'));
  }

  // THE ENDPOINT MUST NOT GROW A GUEST FIELD. The public set is a list of the
  // couple's own event ids; the moment a name or an email is read on this path
  // the endpoint is returning something about a person, which is the one thing
  // its whole header is about not doing.
  const fn = /async function fetchPublicEventIds[\s\S]*?\n}/.exec(api)?.[0] || '';
  const leaked = ['name', 'email', 'phone', 'dietary', 'rsvp_status', 'plus_one']
    .filter((f) => new RegExp(`g\\.${f}|\\.${f}\\b`).test(fn.replace(/^\s*\/\/.*$/gm, '')));
  results.push(leaked.length === 0
    ? pass('the public-set read touches no guest field but event_responses', 'event_responses only')
    : fail('the public-set read touches no guest field but event_responses', 'event_responses only',
           `reads ${leaked.join(', ')}`));

  return results;
}
