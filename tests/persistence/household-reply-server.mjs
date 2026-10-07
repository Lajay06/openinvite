/**
 * tests/persistence/household-reply-server.mjs
 *
 * THE SERVER HALF OF ONE INVITATION ANSWERING FOR SEVERAL PEOPLE.
 *
 * Item 5 of goals/2026-10-07-households-and-children.md, the piece held under
 * that goal's named exception for api/rsvp-submit.js and the household-scoped
 * read it needs. #907 built the form; this is what decides what the form may
 * read and what it may write.
 *
 * ── WHY THESE THREE DECISIONS ARE EXPORTED ─────────────────────────────────
 *
 * Neither endpoint has a `deps` seam, and adding one to a live RSVP path is a
 * bigger change than this item. So each decision is a pure function of plain
 * values, exported and driven here, exactly as confirmationRecipient and
 * keepOnlyInvitedEvents already are in that file:
 *
 *   pickHouseholdRows  what a lead's browser is told about their household
 *   memberWrites       which member answers are accepted, and which refused
 *   the receipt        who the confirmation email names
 *
 * `refOf` is injectable on the first two for the same reason: hashId is an
 * HMAC under the admin key, which this process does not have.
 *
 * ── THE PROPERTY THAT MATTERS MOST ─────────────────────────────────────────
 *
 * A token is a capability, and the capability a MEMBER was given is to answer
 * for themselves. So a member's own link must not be able to answer for the
 * household, and a ref must not be a way to reach a row the holder does not
 * lead. Both are driven below, and both are the reason the read and the write
 * each re-derive the household from the holder's own row rather than trusting
 * anything in the request.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { renderRsvpConfirmationEmail } from '../../src/lib/emailTemplate.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// A stand-in for hashId: one-way enough for a test, and the point is that the
// endpoints never match a ref any other way than by computing it themselves.
const refOf = (id) => (id ? `ref:${id}` : null);

const WEDDING = {
  id: 'w1', coupleName: 'Alex and Sam', weddingDate: '2027-05-01',
  mainCeremony: { venueName: 'The Old Observatory' },
  reception: { venueName: 'The Long Room' },
};
const er = (pairs, over = {}) => pairs.map(([event_id, invited]) => ({
  event_id, invited, status: 'pending', meal_choice: null,
  plus_ones: 0, plus_one_names: [], responded_at: null, ...(over[event_id] || {}),
}));

const PRIYA = {
  id: 'g1', name: 'Priya Patel', email: 'priya@example.com', household_id: 'h1',
  created_by_id: 'owner-1', created_date: '2027-01-01T00:00:00Z',
  event_responses: er([['main-ceremony', true], ['reception', true]]),
};
const DEV = {
  id: 'g2', name: 'Dev Patel', household_id: 'h1', created_by_id: 'owner-1',
  created_date: '2027-01-02T00:00:00Z',
  event_responses: er([['main-ceremony', true], ['reception', true]]),
};
const MINA = {
  id: 'g3', name: 'Mina Patel', is_child: true, child_age: 6, household_id: 'h1',
  created_by_id: 'owner-1', created_date: '2027-01-03T00:00:00Z',
  event_responses: er([['main-ceremony', true], ['reception', false]]),
};
const HOUSE = [PRIYA, DEV, MINA];

export async function runHouseholdReplyServer() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // `new Resend(process.env.RESEND_API_KEY)` runs at module scope in
  // rsvp-submit.js and throws without one. Placeheld for the import exactly as
  // rsvp-confirmation-email.mjs does it; the suite runner sets one too.
  const priorResendKey = process.env.RESEND_API_KEY;
  if (!priorResendKey) process.env.RESEND_API_KEY = 're_household_guard_placeholder';
  const { pickHouseholdRows } = await import('../../api/rsvp-lookup.js');
  const { memberWrites } = await import('../../api/rsvp-submit.js');
  if (priorResendKey === undefined) delete process.env.RESEND_API_KEY;

  // ── WHAT A LEAD'S BROWSER IS TOLD ───────────────────────────────────────

  const rows = pickHouseholdRows({ members: HOUSE, holder: PRIYA, refOf });
  check('the rows come back lead first',
        rows.map((r) => r.name), ['Priya Patel', 'Dev Patel', 'Mina Patel']);
  check('  with the two facts a browser cannot work out for itself',
        rows.map((r) => [r.is_you, r.is_lead]), [[true, true], [false, false], [false, false]]);
  check('  a ref per member, which is what a submission carries',
        rows.map((r) => r.ref), ['ref:g1', 'ref:g2', 'ref:g3']);
  check('  the child marked, and nothing about the age',
        rows.map((r) => r.is_child), [false, false, true]);
  // THE WHOLE CONTRACT, AS AN EXACT KEY SET. A field added here reaches a
  // guest's browser, so the list is asserted rather than spot-checked.
  check('  and exactly these keys, nothing else off anyone\'s record',
        [...new Set(rows.flatMap((r) => Object.keys(r)))].sort(),
        ['event_responses', 'is_child', 'is_lead', 'is_you', 'name', 'ref']);
  ok('  so no id, email, phone, dietary or age can reach the form',
     !/g1|g2|g3|priya@example\.com|child_age|"6"|:6/.test(JSON.stringify(rows).replace(/ref:g\d/g, '')),
     'refs and names only');
  check('each member brings their own events',
        rows.map((r) => r.event_responses.filter((e) => e.invited).map((e) => e.event_id)),
        [['main-ceremony', 'reception'], ['main-ceremony', 'reception'], ['main-ceremony']]);

  // THE READ IS WHERE "ANSWER FOR YOURSELF ALONE" IS ENFORCED FIRST: a
  // member's browser is never given a household at all.
  ok('a member\'s own link is told nothing about the household',
     pickHouseholdRows({ members: HOUSE, holder: DEV, refOf }) === null, 'null');
  ok('  and neither is a child\'s',
     pickHouseholdRows({ members: HOUSE, holder: MINA, refOf }) === null, 'null');
  ok('a guest who is their own invitation gets no household',
     pickHouseholdRows({ members: [PRIYA], holder: PRIYA, refOf }) === null, 'null');
  // THE LEAD RULE IS household.js's, UNCHANGED: an addressable email first.
  // Priya is not the earliest row here, and she is still the lead.
  ok('the lead is the member with an addressable email, not the earliest row',
     pickHouseholdRows({ members: [DEV, MINA, PRIYA], holder: PRIYA, refOf })?.[0].name === 'Priya Patel',
     'household.js');

  const stored = pickHouseholdRows({
    members: HOUSE, holder: PRIYA, refOf,
    rowsByRef: {
      'ref:g2': [{
        event_id: 'main-ceremony', status: 'yes', meal_choice: 'fish',
        plus_ones: 0, plus_one_names: [], created_date: '2027-02-01T00:00:00Z',
      }],
    },
  });
  check('a member\'s stored reply is overlaid from their own rows',
        stored[1].event_responses.find((e) => e.event_id === 'main-ceremony').status, 'yes');
  check('  and nobody else\'s is',
        stored[2].event_responses.find((e) => e.event_id === 'main-ceremony').status, 'pending');

  // ── WHICH MEMBER ANSWERS ARE ACCEPTED ───────────────────────────────────

  const answer = (ref, entries) => ({ ref, event_responses: entries });
  const yes = (event_id, extra = {}) => ({ event_id, status: 'yes', ...extra });

  const accepted = memberWrites({
    submitted: [
      answer('ref:g2', [yes('main-ceremony', { meal_choice: 'fish' }), { event_id: 'reception', status: 'no' }]),
      answer('ref:g3', [yes('main-ceremony')]),
    ],
    household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
  });
  check('a lead\'s answers for their household are accepted',
        accepted.writes.map((w) => [w.ref, w.guest.name, w.eventResponses.map((r) => `${r.event_id}:${r.status}`)]),
        [['ref:g2', 'Dev Patel', ['main-ceremony:yes', 'reception:no']],
         ['ref:g3', 'Mina Patel', ['main-ceremony:yes']]]);
  check('  with nothing rejected', accepted.rejected, []);
  check('  and the meal choice they picked', accepted.writes[0].eventResponses[0].meal_choice, 'fish');

  // #891's RULE, PER MEMBER. Mina is not at the reception, so a reception row
  // for her is dropped however it arrived.
  const uninvited = memberWrites({
    submitted: [answer('ref:g3', [yes('main-ceremony'), yes('reception')])],
    household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
  });
  check('an event a member was not invited to is dropped',
        uninvited.writes[0].eventResponses.map((r) => r.event_id), ['main-ceremony']);
  check('  and a member with nothing allowed is rejected rather than written',
        memberWrites({
          submitted: [answer('ref:g3', [yes('reception')])],
          household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
        }), { writes: [], rejected: [{ ref: 'ref:g3', reason: 'nothing_allowed' }] });

  // A PLUS-ONE IS THE LEAD'S, AND THE SERVER DOES NOT TRUST THE FORM.
  const smuggled = memberWrites({
    submitted: [answer('ref:g2', [yes('main-ceremony', { plus_ones: 1, plus_one_names: ['A Stowaway'] })])],
    household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
  });
  check('a plus-one smuggled into a member\'s answer is stripped',
        [smuggled.writes[0].eventResponses[0].plus_ones, smuggled.writes[0].eventResponses[0].plus_one_names],
        [0, []]);

  // THE PROPERTY THAT MATTERS MOST: a member cannot answer for the household.
  check('a member\'s own link cannot answer for anyone else',
        memberWrites({
          submitted: [answer('ref:g1', [yes('main-ceremony')]), answer('ref:g3', [yes('main-ceremony')])],
          household: HOUSE, holder: DEV, wedding: WEDDING, refOf,
        }),
        { writes: [], rejected: [{ ref: 'ref:g1', reason: 'not_the_lead' }, { ref: 'ref:g3', reason: 'not_the_lead' }] });
  check('a ref that resolves to nobody is rejected, not guessed at',
        memberWrites({
          submitted: [answer('ref:someone-elses-guest', [yes('main-ceremony')])],
          household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
        }).rejected, [{ ref: 'ref:someone-elses-guest', reason: 'unknown_member' }]);
  check('  as is an empty ref',
        memberWrites({
          submitted: [answer('', [yes('main-ceremony')])],
          household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
        }).rejected, [{ ref: '', reason: 'unknown_member' }]);
  check('the holder\'s own ref is rejected, so a reply cannot be written twice',
        memberWrites({
          submitted: [answer('ref:g1', [yes('main-ceremony')])],
          household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
        }).rejected, [{ ref: 'ref:g1', reason: 'holder_answers_in_event_responses' }]);
  const dupe = memberWrites({
    submitted: [answer('ref:g2', [yes('main-ceremony')]), answer('ref:g2', [{ event_id: 'main-ceremony', status: 'no' }])],
    household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf,
  });
  check('a repeated ref is written once and the second is rejected',
        [dupe.writes.length, dupe.rejected], [1, [{ ref: 'ref:g2', reason: 'duplicate_ref' }]]);
  check('a household of one accepts no member answers',
        memberWrites({
          submitted: [answer('ref:g2', [yes('main-ceremony')])],
          household: [PRIYA], holder: PRIYA, wedding: WEDDING, refOf,
        }).rejected, [{ ref: 'ref:g2', reason: 'not_the_lead' }]);
  check('and a submission with no members changes nothing',
        memberWrites({ submitted: [], household: HOUSE, holder: PRIYA, wedding: WEDDING, refOf }),
        { writes: [], rejected: [] });

  // ── THE RECEIPT NAMES EVERYONE IT ANSWERED FOR ──────────────────────────

  const receipt = renderRsvpConfirmationEmail({
    universeId: 'london', coupleNames: 'Alex and Sam', guestName: 'Priya and Dev',
    attending: true, date: '2027-05-01', venueName: 'The Old Observatory',
    people: [
      { name: 'Priya Patel', attending: true },
      { name: 'Dev Patel', attending: true },
      { name: 'Mina Patel', attending: false },
    ],
  });
  ok('the receipt greets the household, not its first word',
     receipt.html.includes('Hi Priya and Dev,'), 'invitationGreetingName');
  ok('  and names who is coming',
     receipt.html.includes('Coming: Priya Patel, Dev Patel.'), 'by name');
  ok('  and who is not',
     receipt.html.includes('Not coming: Mina Patel.'), 'by name');
  ok('  in the text part as well',
     receipt.text.includes('Coming: Priya Patel, Dev Patel.')
     && receipt.text.includes('Not coming: Mina Patel.'), 'both parts');
  const single = renderRsvpConfirmationEmail({
    universeId: 'london', coupleNames: 'Alex and Sam', guestName: 'Nora Kelly',
    attending: true, date: '2027-05-01',
  });
  ok('a single guest\'s receipt is the one that shipped before this',
     single.html.includes('Hi Nora,') && !/Coming:/.test(single.html), 'unchanged');

  // ── THE READ'S SCOPES, WHICH CANNOT BE DRIVEN WITHOUT A NETWORK ─────────

  const auth = code(read('api/_lib/rsvpAuth.js'));
  ok('the household read is scoped to the holder\'s own household and owner',
     /household_id: guest\.household_id,\s*created_by_id: guest\.created_by_id,/.test(auth), 'both');
  ok('  and the rows are re-checked against both after the query',
     /String\(g\.household_id \|\| ''\)\.trim\(\) === raw && g\.created_by_id === guest\.created_by_id/.test(auth),
     'the query is not the check');
  ok('  a blank household_id reads nobody but the holder',
     /if \(!raw \|\| !guest\?\.created_by_id\) return \[\];/.test(auth), "'' is not a household");
  ok('  and names are restored through the one PII boundary',
     /\.map\(\(g\) => mergeGuestPii\(g\)\)/.test(auth), 'mergeGuestPii');

  const lookup = code(read('api/rsvp-lookup.js'));
  ok('only a primary token asks for a household at all',
     /if \(role === 'primary'\) \{/.test(lookup), 'never a plus-one');
  ok('  the household is absent rather than empty when there is none',
     /\.\.\.\(household \? \{ household \} : \{\}\)/.test(lookup), 'feature-detected');
  ok('  a failed household read is the single-guest form, not a broken link',
     /household read failed/.test(lookup) && /return \[\];/.test(lookup), 'not fatal');
  ok('  and the per-member reads are capped',
     /MAX_HOUSEHOLD_READS = 12/.test(lookup), 'a card in the post, not a mailing list');

  const submit = code(read('api/rsvp-submit.js'));
  ok('a plus-one never writes for a household',
     /const submittedMembers = !isPlusOne && Array\.isArray\(req\.body\?\.members\)/.test(submit), 'skipped');
  ok('  the household is re-read from the holder\'s own row, never taken from the request',
     /await resolveHousehold\(guest\)/.test(submit) && !/req\.body\?\.household/.test(submit), 'server-derived');
  ok('  and the response says how many member answers were written and refused',
     /members_written: memberResult\.writes\.length/.test(submit)
     && /members_rejected: memberResult\.rejected\.length/.test(submit), 'numbers, not inference');

  return results;
}
