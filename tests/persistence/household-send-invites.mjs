/**
 * tests/persistence/household-send-invites.mjs
 *
 * ONE EMAIL PER INVITATION, ADDRESSED TO THE LEAD.
 *
 * Item 4 of goals/2026-10-07-households-and-children.md. Three people on one
 * card get one email, to the one member an invitation can be addressed to, and
 * every email count in the send modal counts invitations rather than people.
 *
 * ── WHAT IS DRIVEN AND WHAT IS READ ────────────────────────────────────────
 *
 * The grouping and the greeting are pure, so they are DRIVEN: invitationsFor
 * is called on a fixture and renderInvitationEmail is the real renderer, the
 * same function api/send-invites.js hands to Resend. The modal is JSX and
 * cannot be imported here, so its wiring is read from source, with comments
 * stripped first: a sentence about a rule has satisfied a check about code
 * three times in this goal already.
 *
 * ── THE PART THAT IS NOT HERE YET, AND WHY THE GUARD SAYS SO ───────────────
 *
 * The greeting a guest actually reads comes from the composed BODY, not from
 * the template's default message: the modal always sends one, prefilled with
 * "Hi [Guest name],", and the tag is resolved per recipient inside
 * api/send-invites.js. That file is held under the goal's named exception, so
 * until the held change lands the body still greets the lead alone while the
 * review list and the recipient name are the household's.
 *
 * So the invariant pinned here is the one that must hold at EVERY point, now
 * and after: THE TWO COPIES OF replaceMergeTags AGREE. The preview pane is
 * documented as byte-for-byte what gets sent, and a preview that greets two
 * people where the email greets one would be worse than the gap itself.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';
import { invitationsFor, salutation } from '../../src/lib/household.js';
import { invitationGreetingName, greetableFirstName } from '../../src/lib/guestGreeting.js';
import { renderInvitationEmail } from '../../src/lib/emailTemplate.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Comments out, so a check about code cannot be satisfied by prose about code.
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const g = (id, name, over = {}) => ({
  id, name, created_date: '2027-01-01T00:00:00Z', rsvp_link_id: `tok-${id}`, ...over,
});
// The goal's fixture household, plus a household with nobody to send to and a
// guest who is their own invitation.
const LIST = [
  g('g1', 'Priya Patel', { household_id: 'h1', email: 'priya@example.com' }),
  g('g2', 'Dev Patel', { household_id: 'h1' }),
  g('g3', 'Mina Patel', { household_id: 'h1', is_child: true, child_age: 6 }),
  g('g4', 'Anna Singh', { email: 'anna@example.com' }),
  g('g5', 'Tom Reed', { household_id: 'h2' }),
  g('g6', 'Jo Reed', { household_id: 'h2' }),
];

export async function runHouseholdSendInvites() {
  const results = [];
  const check = (label, got, want) => results.push(
    JSON.stringify(got) === JSON.stringify(want)
      ? pass(label, JSON.stringify(got))
      : fail(label, JSON.stringify(want), JSON.stringify(got)));
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── ONE ENTRY PER INVITATION ────────────────────────────────────────────

  const invites = invitationsFor(LIST);
  check('one entry per invitation, not per person',
        invites.length, 3);
  check('  addressed to the lead, named by the salutation',
        invites.map((i) => `${i.name} <${i.email || 'none'}>`),
        ['Priya and Dev <priya@example.com>', 'Anna Singh <anna@example.com>', 'Tom and Jo <none>']);
  check('  with every member still on the invitation',
        invites.map((i) => i.members.length), [3, 1, 2]);
  check('  and the lead is the member with an addressable email',
        invites[0].lead.id, 'g1');

  // A MEMBER WITHOUT AN EMAIL IS NOT A MISSING-EMAIL PROBLEM. Dev and Mina
  // have no address and never needed one; the household has one.
  const withEmail = invites.filter((i) => i.email);
  const noEmail = invites.filter((i) => !i.email);
  check('a member with no email is not counted as missing one',
        [withEmail.length, noEmail.length], [2, 1]);
  check('  and the household with nobody to send to is named, not counted away',
        noEmail.map((i) => i.name), ['Tom and Jo']);
  // A MALFORMED ADDRESS IS NO ADDRESS, by the same rule the lead is chosen by.
  check('a typo in the only email makes the invitation "No email yet"',
        invitationsFor([g('g7', 'Sam Vale', { household_id: 'h3', email: 'sam@' })])[0].email, '');

  // GROUPED OVER THE LIST GIVEN, which is a selection: a card addressed to
  // "Priya and Dev" when the couple selected only Priya would be wrong.
  // One member of a household in the list is one person on the invitation, so
  // they are addressed by their own name: a salutation is first names, and
  // dropping Priya's surname off her own card buys nothing.
  check('a household split by a filter addresses who was selected',
        invitationsFor([LIST[0], LIST[3]]).map((i) => i.name), ['Priya Patel', 'Anna Singh']);

  // ── THE GREETING ────────────────────────────────────────────────────────

  check('one person is greeted by first name', invitationGreetingName('Nora Kelly'), 'Nora');
  check('a salutation travels whole', invitationGreetingName('Priya and Dev'), 'Priya and Dev');
  // THE OLDER BUG IN THE SAME LINE: the first-word rule greeted a family as
  // "Dear The,".
  check('a family name travels whole', invitationGreetingName('The Smith Family'), 'The Smith Family');
  check('  as does an ampersand pair', invitationGreetingName('Nora & Sam'), 'Nora & Sam');
  check('and an empty name still starts a sentence', invitationGreetingName(''), 'there');
  check("  while the API's placeholder is unchanged from before this existed",
        invitationGreetingName('Guest'), 'Guest');
  ok('the greeting rule is the guest-site rule plus a floor',
     greetableFirstName('The Smith Family') === null, 'one rule, two callers');

  // ── THE REAL RENDERER ───────────────────────────────────────────────────

  const render = (type, guestName) => renderInvitationEmail({
    type, guestName, coupleNames: 'Alex and Sam', events: [{ name: 'Ceremony', date: '2027-05-01' }],
    rsvpUrl: 'https://example.com/rsvp/t', rsvpToken: 't', universeId: 'london',
  });
  const house = salutation(LIST.slice(0, 3));
  check('the salutation the email is built with', house, 'Priya and Dev');
  ok('the invitation greets the household',
     render('invite', house).html.includes('Dear Priya and Dev,'), 'default message');
  ok('  and so does the reminder, by the same rule',
     render('reminder', house).html.includes('Hi Priya and Dev,'), 'one rule, every type');
  ok('  a single guest is unchanged',
     render('invite', 'Nora Kelly').html.includes('Dear Nora,'), 'first name');
  ok('  and the text part says the same thing as the html',
     render('invite', house).text.includes('Dear Priya and Dev,'), 'both parts');

  // ── THE MODAL'S WIRING ──────────────────────────────────────────────────

  const modal = code(read('src/components/guests/SendInvitesModal.jsx'));
  ok('the modal groups through the one resolver',
     /invitationsFor\(selectedGuests\)/.test(modal), 'household.js');
  ok('  and sends through it too, from the list that carries the tokens',
     /invitationsFor\(withTokens\)/.test(modal), 'one grouping, not a copy');
  ok('  with the lead\'s link and the lead\'s events',
     /rsvpUrl: buildRsvpUrl\(i\.lead\.rsvp_link_id\)/.test(modal)
     && /events: buildGuestEvents\(i\.lead\)/.test(modal), 'the lead is the recipient');
  ok('  and the salutation as the recipient name',
     /email: i\.email, name: i\.name,/.test(modal), 'name is the salutation');

  // ONE RECIPIENT LIST, so a reminder cannot take a different path from an
  // invitation: the goal asks for both to follow this rule and the cheapest way
  // to keep that true is for there to be nowhere else to do it.
  check('there is one place recipients are built',
        (modal.match(/const recipients = \[/g) || []).length, 1);
  ok('  and it is not branched on the send type',
     !/type === '(invite|reminder)'[\s\S]{0,200}const recipients/.test(modal), 'type-agnostic');

  ok('the email channel counts invitations',
     /\$\{invitationsWithEmail\.length\} invitation/.test(modal), 'not guests');
  ok('  and names the ones with no email yet',
     /No email yet/.test(modal) && /invitationsNoEmail\.map/.test(modal), 'one line each');
  ok('  while whatsapp stays a count of people',
     /\$\{nPeople\} guest\$\{plural\(nPeople\)\}/.test(modal), 'per phone number');
  ok('  and the review tile says which unit it is showing',
     /label: 'Invitations', value: `\$\{selectedInvitations\.length\}`/.test(modal), 'invitations');
  // THE OLD PER-GUEST EMAIL COUNT IS GONE, not merely unused.
  ok('nothing still counts guests with an email',
     !/selectedWithEmail|selectedNoEmail/.test(modal), 'removed');

  // ── THE PREVIEW AND THE SEND AGREE ──────────────────────────────────────
  //
  // The held api/send-invites.js change moves both of these together. Until
  // then they are both the first-word rule, which is a gap; what would be a
  // defect is the two disagreeing, and that is what this pins.
  const derivation = (src) => {
    const fn = src.slice(src.indexOf('function replaceMergeTags'));
    const line = (fn.split('\n').slice(0, 4).find((l) => /const (firstName|greetName)/.test(l)) || '');
    // The fallback differs on purpose: the modal shows the tag back to the
    // couple, the server floors to a word.
    return line.replace(/'(\[Guest name\]|Guest|there)'/g, "'<fallback>'").trim();
  };
  const serverDerivation = derivation(read('api/send-invites.js'));
  ok('the server resolves [Guest name] somewhere in replaceMergeTags',
     serverDerivation.length > 0, serverDerivation);
  check('the preview resolves it exactly the same way',
        derivation(read('src/components/guests/SendInvitesModal.jsx')), serverDerivation);

  return results;
}
