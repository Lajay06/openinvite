/**
 * tests/persistence/invited-stamp-scope.mjs
 *
 * A GUEST IS STAMPED INVITED ONLY IF AN EMAIL ACTUALLY REACHED THEM.
 *
 * ── THE BUG ────────────────────────────────────────────────────────────────
 *
 * SendInvitesModal built its recipient list from the invitations that HAVE an
 * address, then wrote `invite_sent_at` and a `send_history` entry over every
 * selected guest. So a guest with no email read as invited. In the worst case,
 * a selection of only no-email guests, the modal skipped the network call
 * entirely (`if (recipients.length > 0)`) and still stamped all of them: zero
 * emails sent, N guests marked invited.
 *
 * The screen was already right. It computes `invitationsNoEmail` and renders a
 * red "No email" against those rows. Only the write path disagreed with what
 * the couple could see, which is the worst place for a disagreement to live.
 *
 * ── THE TWO RULINGS, 2026-10-12 ───────────────────────────────────────────
 *
 * 1. A household member with no address of their own IS invited when the
 *    invitation went out. One email per household is the model, so it reached
 *    them, and stamping only the lead would show the rest as uninvited.
 * 2. A guest alone on an invitation with no address gets nothing at all: no
 *    stamp, no history entry.
 *
 * ── WHY THE LOGIC LIVES IN src/lib ────────────────────────────────────────
 *
 * The modal is a React component and cannot be exercised here. The rule was
 * extracted to src/lib/sentRecipients.js so it can be asserted against real
 * shapes rather than through a rendered tree, and so the held follow-up can
 * point api/send-invites.js at the same module instead of restating the rule a
 * second time. Two implementations of one rule drift, and the drift shows up as
 * a guest stamped for an email the server declined to send.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { sentGuestIds, guestsActuallySent } from '../../src/lib/sentRecipients.js';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

export async function runInvitedStampScope() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── RULE 1: EVERY MEMBER OF AN EMAILED HOUSEHOLD ────────────────────────
  const household = {
    householdId: 'h1', email: 'lead@example.com',
    lead: { id: 'g1', email: 'lead@example.com' },
    members: [{ id: 'g1', email: 'lead@example.com' }, { id: 'g2', email: '' }, { id: 'g3' }],
  };
  const ids1 = sentGuestIds({ emailedInvitations: [household] });
  ok('every member of an emailed household is stamped, not just the lead',
     ids1.size === 3 && ids1.has('g1') && ids1.has('g2') && ids1.has('g3'),
     `${ids1.size} ids`);
  ok('  including the two with no address of their own',
     ids1.has('g2') && ids1.has('g3'), 'the invitation reached them');

  // ── RULE 2: NOTHING FOR AN INVITATION THAT WAS NOT SENT ─────────────────
  //
  // The caller passes only the invitations it really emailed, so an
  // unaddressed one simply never appears. This asserts the consequence that
  // matters: nobody is stamped from an empty send.
  const ids2 = sentGuestIds({ emailedInvitations: [] });
  ok('an empty send stamps nobody', ids2.size === 0, '0 ids');
  ok('  and so does a call with no arguments at all', sentGuestIds().size === 0, '0 ids');

  const soloNoEmail = { householdId: null, email: '', lead: { id: 'solo' }, members: [{ id: 'solo' }] };
  const ids3 = sentGuestIds({ emailedInvitations: [household], plusOneGuests: [] });
  ok('a guest left out of the emailed set is not stamped',
     !ids3.has('solo'), 'solo absent');
  // And if the caller ever DID pass it, the set would contain it: this module
  // reports who was sent to, it does not re-decide addressability. Asserted so
  // the division of responsibility is visible rather than assumed.
  ok('  the module reports the send, it does not re-filter on address',
     sentGuestIds({ emailedInvitations: [soloNoEmail] }).has('solo'),
     'the caller decides who was emailed');

  // ── PLUS-ONES ───────────────────────────────────────────────────────────
  const ids4 = sentGuestIds({ emailedInvitations: [], plusOneGuests: [{ id: 'p1' }, { id: 'p2' }] });
  ok('a guest whose plus-one was emailed is stamped', ids4.size === 2 && ids4.has('p1'), '2 ids');

  // ── MALFORMED SHAPES DO NOT SILENTLY STAMP NOBODY ───────────────────────
  const leadOnly = { lead: { id: 'L' } };
  ok('an invitation carrying only a lead still stamps the lead',
     sentGuestIds({ emailedInvitations: [leadOnly] }).has('L'), 'lead fallback');
  ok('  and an invitation with neither contributes nothing rather than throwing',
     sentGuestIds({ emailedInvitations: [{}] }).size === 0, '0 ids');
  ok('  a member with no id is skipped, not stamped as undefined',
     sentGuestIds({ emailedInvitations: [{ members: [{ email: 'nobody@example.com' }] }] }).size === 0, '0 ids');

  // ── guestsActuallySent ──────────────────────────────────────────────────
  const all = [{ id: 'g1' }, { id: 'g2' }, { id: 'solo' }];
  const kept = guestsActuallySent(all, ids1);
  ok('guestsActuallySent keeps only the ids in the set',
     kept.length === 2 && kept.every(g => g.id !== 'solo'), `${kept.length} of 3`);
  ok('  and an empty set keeps nobody',
     guestsActuallySent(all, new Set()).length === 0, '0');

  // ── THE MODAL USES IT FOR BOTH WRITES ───────────────────────────────────
  const modal = stripComments(read('src/components/guests/SendInvitesModal.jsx'));

  ok('the modal derives the set from the emailed invitations and plus-ones',
     /sentGuestIds\(\{\s*emailedInvitations: emailList,\s*plusOneGuests: plusOneEmailList\s*\}\)/.test(modal),
     'from emailList');

  ok('  the send_history write takes sentGuests',
     /historyEntries = await Promise\.all\(\s*sentGuests\.map/.test(modal), 'sentGuests');

  // BOTH stamp branches, the one with invite_sent_at and the one without.
  const stampLoops = (modal.match(/sentGuests\.map\(g =>/g) || []).length;
  ok('  and BOTH stamp branches take it, invite/reminder and everything else',
     stampLoops === 2, `${stampLoops} branches`);

  ok('  no write loop iterates withTokens any more',
     !/withTokens\.map\(\s*async\s*\(g\)/.test(modal) && !/withTokens\.map\(g =>\s*\n?\s*base44\.entities\.Guest\.update/.test(modal),
     'withTokens is the send input, not the write input');

  return results;
}
