/**
 * tests/persistence/household-rsvp-form.mjs
 *
 * ONE LINK, EVERY MEMBER'S OWN ANSWER.
 *
 * Item 5 of goals/2026-10-07-households-and-children.md. The lead's own link
 * opens the RSVP form with every member of their household on it: one status
 * and one meal choice each, plus-one controls on the lead alone.
 *
 * ── WHAT IS DRIVEN ─────────────────────────────────────────────────────────
 *
 * RSVPPage.jsx is a guest-facing page behind a capability token, so nothing
 * here can render it. That is why src/lib/householdRsvp.js exists: every
 * decision is a pure function of the rows the read supplies, and this guard
 * calls them against that row shape, through the real getWeddingEvents and
 * getGuestEventResponse rather than a hand-made event list.
 *
 * The page's own wiring is read from source with comments stripped, because a
 * sentence about a rule has satisfied a check about code three times in this
 * goal already.
 *
 * ── THE ROW CONTRACT, WHICH IS WHAT THE HELD READ MUST SUPPLY ──────────────
 *
 * { ref, name, is_child, is_lead, is_you, event_responses }, lead first.
 *
 * No ids, no emails, no created dates: api/rsvp-lookup.js withholds them on
 * purpose, and deciding who the lead is needs exactly those. So the read
 * states it and the form trusts the statement, which is honest about where the
 * authority lives. The enforcement is the server's: it does not return a
 * household to a token that is not a lead's, and refuses a member write from
 * one. api/rsvp-lookup.js returns no household at all today, so this guard
 * also drives the state that ships first: A PAYLOAD WITH NO HOUSEHOLD IS THE
 * SINGLE-GUEST FORM, unchanged.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import {
  householdForm, seedMemberForms, memberEvents, memberSubmissions,
  everyMemberAnswered, membersStillToAnswer,
} from '../../src/lib/householdRsvp.js';
import { getWeddingEvents } from '../../src/lib/weddingEvents.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const WEDDING = {
  coupleName: 'Alex and Sam',
  weddingDate: '2027-05-01',
  mainCeremony: { venueName: 'The Old Observatory' },
  reception: { venueName: 'The Long Room' },
};
const er = (pairs, over = {}) => pairs.map(([event_id, invited]) => ({
  event_id, invited, status: 'pending', meal_choice: null,
  plus_ones: 0, plus_one_names: [], responded_at: null, ...(over[event_id] || {}),
}));

// The goal's fixture household, in the row shape the read supplies. Mina is
// six and is not at the reception; Dev has already answered the ceremony.
const PRIYA = {
  ref: 'ref-g1', name: 'Priya Patel', is_child: false, is_lead: true, is_you: true,
  event_responses: er([['main-ceremony', true], ['reception', true]]),
};
const DEV = {
  ref: 'ref-g2', name: 'Dev Patel', is_child: false, is_lead: false, is_you: false,
  event_responses: er([['main-ceremony', true], ['reception', true]],
                      { 'main-ceremony': { status: 'yes', meal_choice: 'fish' } }),
};
const MINA = {
  ref: 'ref-g3', name: 'Mina Patel', is_child: true, is_lead: false, is_you: false,
  event_responses: er([['main-ceremony', true], ['reception', false]]),
};
const HOUSE = [PRIYA, DEV, MINA];
const HOLDER = { name: 'Priya Patel', plus_one: true };

export async function runHouseholdRsvpForm() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  check('the fixture wedding has the two events the household is answering for',
        getWeddingEvents(WEDDING).map((e) => e.event_id), ['main-ceremony', 'reception']);

  // ── WHO IS ON THE FORM ──────────────────────────────────────────────────

  const lead = householdForm({ holder: HOLDER, household: HOUSE });
  ok("the lead's link opens a household form", lead.active, 'active');
  check('  with every member on it, in the order the read gave them',
        lead.members.map((m) => `${m.name}${m.isChild ? ' (child)' : ''}${m.isHolder ? ' [you]' : ''}`),
        ['Priya Patel [you]', 'Dev Patel', 'Mina Patel (child)']);
  check('  and a ref for everyone, which is what a submission carries',
        lead.members.map((m) => m.ref), ['ref-g1', 'ref-g2', 'ref-g3']);
  ok('  and no raw guest id anywhere in it',
     !JSON.stringify(lead.members).includes('"id":"g'), 'refs only');

  // A MEMBER'S OWN LINK ANSWERS FOR THEMSELVES ALONE. The read says who the
  // holder is and whether they lead; a member's token gets no household at all
  // from the server, and this is the second line of the same rule.
  const asMember = HOUSE.map((r) => ({ ...r, is_you: r === DEV }));
  ok("a member's own link does not open the household form",
     !householdForm({ holder: HOLDER, household: asMember }).active, 'is_you is not the lead');
  ok('  and neither does a row set with nobody flagged as the holder',
     !householdForm({ holder: HOLDER, household: HOUSE.map((r) => ({ ...r, is_you: false })) }).active,
     'no is_you');
  // TWO LEADS IS A READ THAT DISAGREES WITH ITSELF; the holder's own flag is
  // what decides, so this stays active and the lead is still the holder.
  ok('  while a second row claiming the lead cannot take the form over',
     householdForm({ holder: HOLDER, household: HOUSE.map((r) => ({ ...r, is_lead: true })) }).active
     && householdForm({ holder: HOLDER, household: HOUSE.map((r) => ({ ...r, is_lead: true })) })
       .members.find((m) => m.isHolder).name === 'Priya Patel', 'is_you decides');

  // THE STATE THAT SHIPS BEFORE THE HELD READ: no household in the payload.
  ok('no household in the payload is the single-guest form',
     !householdForm({ holder: HOLDER, household: [] }).active
     && !householdForm({ holder: HOLDER }).active, 'inactive, which is today');
  ok('  as is a household of one',
     !householdForm({ holder: HOLDER, household: [PRIYA] }).active, 'inactive');
  ok('  and so is a load that has not resolved a guest yet',
     !householdForm({ holder: null, household: HOUSE }).active, 'inactive');

  // ── EACH MEMBER'S OWN EVENTS, AND THEIR OWN STORED ANSWER ───────────────

  const members = lead.members;
  check('each member answers only what they were invited to',
        members.map((m) => memberEvents(m, WEDDING).map((e) => e.event_id)),
        [['main-ceremony', 'reception'], ['main-ceremony', 'reception'], ['main-ceremony']]);

  const seeded = seedMemberForms(members, WEDDING);
  check("a returning household sees each member's own answer",
        seeded['ref-g2']['main-ceremony'],
        { status: 'yes', meal_choice: 'fish', plus_one_attending: false, plus_one_name: '' });
  check("  and nobody else's", seeded['ref-g3']['main-ceremony'].status, '');
  check('  with no entry for an event they are not invited to',
        Object.keys(seeded['ref-g3']), ['main-ceremony']);

  // ── WHAT THE SUBMISSION CARRIES, AND WHAT IT CANNOT ─────────────────────

  const forms = {
    'ref-g2': {
      'main-ceremony': { status: 'yes', meal_choice: 'fish', plus_one_attending: true, plus_one_name: 'A Stowaway' },
      reception: { status: 'no' },
    },
    'ref-g3': { 'main-ceremony': { status: 'yes', meal_choice: 'kids' } },
  };
  const subs = memberSubmissions({ members, forms, wedding: WEDDING, now: 'NOW' });
  check('one submission per member, named by ref, and the holder is not among them',
        subs.map((m) => m.ref), ['ref-g2', 'ref-g3']);
  check('  each carrying only the events that member is invited to',
        subs.map((m) => m.event_responses.map((r) => r.event_id)),
        [['main-ceremony', 'reception'], ['main-ceremony']]);
  // THE LEAD'S CONTROL, AND THE LEAD'S ALONE, enforced in the builder and not
  // only by the page declining to draw a checkbox.
  check("a plus-one in a member's form state never reaches the payload",
        subs.flatMap((m) => m.event_responses.map((r) => [r.plus_ones, r.plus_one_names.length])),
        [[0, 0], [0, 0], [0, 0]]);
  check('  a declined event carries no meal choice',
        subs[0].event_responses[1],
        { event_id: 'reception', status: 'no', meal_choice: null, plus_ones: 0, plus_one_names: [], responded_at: 'NOW' });
  check('  and an attending one carries the one they picked',
        subs[1].event_responses[0].meal_choice, 'kids');
  // NO KEY INSIDE AN ENTRY THAT THE SCHEMA DOES NOT DECLARE (a stop condition
  // of this goal: Base44 drops an unknown field silently).
  check('an entry carries exactly the declared keys',
        Object.keys(subs[0].event_responses[0]).sort(),
        ['event_id', 'meal_choice', 'plus_one_names', 'plus_ones', 'responded_at', 'status']);

  // A MEMBER THE SERVER COULD NOT NAME IS NOT ANSWERED FOR. No ref, no
  // submission: an answer that cannot be attributed must not be written.
  const refless = householdForm({
    holder: HOLDER, household: [PRIYA, { ...DEV, ref: undefined }],
  });
  check('a member with no ref is not submitted for',
        memberSubmissions({
          members: refless.members,
          forms: { [refless.members[1].id]: { 'main-ceremony': { status: 'yes' } } },
          wedding: WEDDING, now: 'NOW',
        }), []);

  // ONLY ANSWERS TRAVEL.
  const partial = memberSubmissions({
    members, forms: { 'ref-g2': { 'main-ceremony': { status: 'yes' } } }, wedding: WEDDING, now: 'NOW',
  });
  check('an unanswered event is not submitted as pending',
        partial.map((m) => [m.ref, m.event_responses.map((r) => r.event_id)]),
        [['ref-g2', ['main-ceremony']]]);
  ok('  and a member with nothing answered is not submitted at all',
     !partial.some((m) => m.ref === 'ref-g3'), 'dropped');
  check('a form that is not a household submits no members',
        memberSubmissions({
          members: householdForm({ holder: HOLDER, household: asMember }).members,
          forms, wedding: WEDDING, now: 'NOW',
        }), []);

  // ── THE BUTTON SAYS WHO IT IS WAITING FOR ───────────────────────────────

  ok('the submit waits for every member',
     !everyMemberAnswered({ members, forms: { 'ref-g2': forms['ref-g2'] }, wedding: WEDDING }), 'incomplete');
  check('  and names who is still to answer',
        membersStillToAnswer({ members, forms: { 'ref-g2': forms['ref-g2'] }, wedding: WEDDING }), ['Mina Patel']);
  ok('  and is satisfied when they all have',
     everyMemberAnswered({ members, forms, wedding: WEDDING }), 'complete');
  ok('  while a single guest is never waiting for anyone',
     everyMemberAnswered({ members: [], forms: {}, wedding: WEDDING }), 'vacuously true');
  // A MEMBER WITH NOTHING TO ANSWER IS NOT A BLOCKER: a member invited to no
  // event cannot be answered for, so the lead would be stuck forever.
  ok('a member invited to nothing does not block the submit',
     everyMemberAnswered({
       members: householdForm({
         holder: HOLDER,
         household: [PRIYA, { ...DEV, event_responses: er([['main-ceremony', false], ['reception', false]]) }],
       }).members,
       forms: {}, wedding: WEDDING,
     }), 'not a blocker');

  // ── THE PAGE'S WIRING ───────────────────────────────────────────────────

  const page = code(read('src/components/rsvp/RSVPPage.jsx'));
  ok('the page decides through the one resolver',
     /householdForm\(\{ holder: guest, household \}\)/.test(page), 'householdRsvp.js');
  ok('  seeded from the lookup, defaulting to no household',
     /const \{ guest: g, wedding: wd, household: hh \} = await res\.json\(\)/.test(page)
     && /Array\.isArray\(hh\) \? hh\.filter\(Boolean\) : \[\]/.test(page), 'absent is today');
  ok('  and the members are drawn with their own events',
     /memberEvents\(m, wedding\)\.map\(ev => \(/.test(page), 'per member');
  ok('  with no plus-one control',
     /hasPlusOne=\{false\}/.test(page), "the lead's alone");
  ok('  and control ids scoped per member',
     /idScope=\{`\$\{m\.id\}-`\}/.test(page)
     && /id=\{`plusone-\$\{idScope\}\$\{event\.event_id\}`\}/.test(page), 'unique ids');
  ok("the members travel in the submission only when the form is a household's",
     /\.\.\.\(hh\.active \? \{ members: memberSubmissions\(/.test(page), 'absent otherwise');
  ok('  and the submit is gated on them',
     /if \(!allEventsAnswered \|\| !householdComplete\) return;/.test(page)
     && /disabled=\{!allEventsAnswered \|\| !householdComplete \|\| submitting\}/.test(page), 'both');
  ok('  with the names of whoever is still to answer beside it',
     /Still to answer: \{stillToAnswer\.join\(', '\)\}/.test(page), 'by name');

  // AN AGE IS THE COUPLE'S NOTE TO THEMSELVES. A guest sees the word.
  ok('a child is marked on the guest form',
     /\{m\.isChild && \(/.test(page) && />\s*Child\s*</.test(page), '"Child"');
  // CODE, NOT PROSE, and the same lesson in the other direction: this check
  // first read the whole file and failed on the comment that explains the
  // field is not read. A comment naming child_age in order to say nobody
  // renders it is the opposite of the violation, and it is the one place a
  // developer searching for the field should find an answer. What must be
  // absent is a read.
  ok('  and no code on this page reads the age', !/child_age/.test(page), 'nothing renders it');
  ok('  nor in the module the page renders from',
     !/child_age/.test(code(read('src/lib/householdRsvp.js'))), 'isChild only');

  // THE SINGLE-GUEST PATH IS UNTOUCHED, which is what lets this ship before
  // the held read: the holder's own answers stay in the state they were in.
  ok("the holder's own answers still travel in event_responses",
     /event_responses: submittedResponses,/.test(page), 'unchanged');
  ok("  from the page's own eventForm",
     /const submittedResponses = invitedEvents\.map\(ev => \{/.test(page), 'unchanged');

  // ── THE MODULE DOES NOT REACH FOR WHAT IT IS NOT GIVEN ──────────────────
  //
  // Stated as a check because it is the architecture: the lead rule lives in
  // src/lib/household.js and needs emails, created dates and ids. This module
  // is handed none of them, so it must not import that rule and pretend.
  const lib = code(read('src/lib/householdRsvp.js'));
  ok('the form logic does not recompute the lead rule in the browser',
     !/from '\.\/household\.js'/.test(lib) && !/leadOf|membersOf/.test(lib), 'the read states it');

  return results;
}
