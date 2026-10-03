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

  check('a wedding with no guest list yet shows every event',
        publicEventIds(WEDDING, []), ['main-ceremony', 'reception', 'welcome_drinks']);

  check('a custom event the whole list is invited to stays public',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', [{ event_id: 'welcome_drinks', invited: true }]),
        ]),
        ['main-ceremony', 'reception', 'welcome_drinks']);

  check('one guest short and the custom event goes behind personal links',
        publicEventIds(WEDDING, [
          g('A', [{ event_id: 'welcome_drinks', invited: true }]),
          g('B', []),
        ]),
        ['main-ceremony', 'reception']);

  check('a guest removed from the reception takes the reception off the public site',
        publicEventIds(WEDDING, [g('A', [{ event_id: 'reception', invited: false }])]),
        ['main-ceremony']);

  check('a main event nobody was explicitly set for is still public',
        publicEventIds(WEDDING, [g('A', []), g('B', [])]),
        ['main-ceremony', 'reception']);

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
