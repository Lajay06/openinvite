/**
 * tests/persistence/guests-bounce-label.mjs
 *
 * A DEAD ADDRESS IS VISIBLE, FILTERABLE, AND CLEARED WHEN IT IS FIXED.
 *
 * Item 3 of goals/2026-10-10-bounces-and-notes.md. The webhook (item 1) writes
 * Guest.email_bounce and the send endpoint (item 2) skips it; this item is the
 * couple's half: the label on the row, the Bounced filter, the sentence that
 * says what to do, the modal's count, and the clear that happens when the
 * address is actually corrected.
 *
 * WHAT IS DRIVEN AND WHAT IS READ. src/components/guests/emailBounce.js is
 * imported and run for real: the predicate and the clear rule are the parts
 * that can be wrong invisibly, and the clear rule in particular has four
 * cases that all look alike in a diff. The three .jsx surfaces cannot be
 * imported by a node guard, so they are read as source, and each assertion
 * names the call rather than the shape: "GuestList routes the inline edit
 * through withBounceCleared" is a fact about which function decides, not
 * about how the line is written.
 *
 * THE TWO PREDICATES MUST AGREE. The page labels a guest bounced exactly when
 * api/send-invites.js refuses to mail them. That is asserted here against the
 * endpoint's own source, because the failure is silent in both directions: a
 * label with no skip tells the couple a lie, and a skip with no label leaves
 * them re-sending into nothing.
 *
 * COPY IS VERBATIM, from the goal file. Asserted character for character,
 * including the full stops, because every one of these sentences was written
 * by the owner and a paraphrase is a different product.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isBounced,
  withBounceCleared,
  bouncedSkippedSentence,
  BOUNCE_ROW_LABEL,
  BOUNCE_FIX_SENTENCE,
} from '../../src/components/guests/emailBounce.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

const stamp = (over = {}) => ({
  at: '2026-10-11T02:00:00.000Z',
  kind: 'permanent',
  detail: 'mailbox does not exist',
  email_id: 'e_1',
  ...over,
});

export async function runGuestsBounceLabel() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const page = code('src/pages/Guests.jsx');
  const list = code('src/components/guests/GuestList.jsx');
  const modal = code('src/components/guests/SendInvitesModal.jsx');
  const send = code('api/send-invites.js');

  // ── 1. The predicate ──────────────────────────────────────────────────
  ok('a permanent stamp reads as bounced', isBounced({ email_bounce: stamp() }) === true, 'true');
  ok('  a guest with no stamp does not', isBounced({ email: 'a@b.co' }) === false, 'false');
  ok('  nor one whose email_bounce is null', isBounced({ email_bounce: null }) === false, 'false');
  ok('  nor undefined, and it does not throw', isBounced(undefined) === false, 'false');
  // The one enum value today. A second value must be decided on before the
  // page starts calling it a bounce, which is what equality here buys.
  ok('  and a kind this goal has not ruled on does not',
     isBounced({ email_bounce: stamp({ kind: 'transient' }) }) === false, 'false');
  ok('  not even a stamp that is present but empty',
     isBounced({ email_bounce: {} }) === false, 'false');

  ok('the page and the send endpoint agree on what bounced means',
     /email_bounce\?\.kind === 'permanent'/.test(send)
       && /email_bounce\?\.kind === 'permanent'/.test(code('src/components/guests/emailBounce.js')),
     "both match kind === 'permanent' by equality");

  // ── 2. The clear, on change only ──────────────────────────────────────
  const stamped = { id: 'g1', email: 'old@example.com', email_bounce: stamp() };
  const clean = { id: 'g2', email: 'old@example.com' };

  const changed = withBounceCleared({ email: 'new@example.com' }, stamped);
  ok('changing the address clears the stamp',
     changed.email_bounce === null, JSON.stringify(changed));
  ok('  in the same save, not a second one',
     changed.email === 'new@example.com' && Object.keys(changed).sort().join(',') === 'email,email_bounce',
     Object.keys(changed).join(','));

  const unchanged = withBounceCleared({ email: 'old@example.com' }, stamped);
  ok('re-saving the same address clears nothing',
     !('email_bounce' in unchanged), JSON.stringify(unchanged));
  ok('  and neither does whitespace around it',
     !('email_bounce' in withBounceCleared({ email: '  old@example.com  ' }, stamped)),
     JSON.stringify(withBounceCleared({ email: '  old@example.com  ' }, stamped)));

  const unrelated = withBounceCleared({ name: 'Ada' }, stamped);
  ok('an edit that is not the address leaves the stamp alone',
     !('email_bounce' in unrelated), JSON.stringify(unrelated));
  ok('  which is what stops an unrelated save wiping a stamp that just arrived',
     Object.keys(unrelated).join(',') === 'name', Object.keys(unrelated).join(','));

  ok('a guest with no stamp gains no key to clear',
     !('email_bounce' in withBounceCleared({ email: 'new@example.com' }, clean)),
     JSON.stringify(withBounceCleared({ email: 'new@example.com' }, clean)));

  ok('emptying the address clears the stamp too',
     withBounceCleared({ email: null }, stamped).email_bounce === null,
     JSON.stringify(withBounceCleared({ email: null }, stamped)));

  const before = { email: 'new@example.com' };
  withBounceCleared(before, stamped);
  ok('  and the caller’s own object is not mutated',
     !('email_bounce' in before), JSON.stringify(before));

  // ── 3. Both save paths actually use it ────────────────────────────────
  ok('the inline cell edit routes through withBounceCleared',
     /onUpdate\(id, withBounceCleared\(\{ \[field\]: next \|\| null \}, guest\)\)/.test(list),
     'commitEdit');
  ok('the guest form’s save routes through it as well',
     /updateGuest\(editingGuest\.id, withBounceCleared\(restGuestData, editingGuest\)\)/.test(page),
     'handleSubmit');
  // Comments stripped first: this file's own prose explains the clear, and a
  // guard that reads a comment as code would go green on a note about the
  // thing it is meant to find.
  ok('  and neither file re-implements the rule',
     !/email_bounce/.test(stripComments(list, { trailing: true }))
       && !/email_bounce/.test(stripComments(page, { trailing: true })),
     'the clear exists in one place');

  // ── 4. The row ────────────────────────────────────────────────────────
  ok('the row carries the label, verbatim',
     BOUNCE_ROW_LABEL === 'Email bounced', BOUNCE_ROW_LABEL);
  ok('  rendered in the cell that already answers "was this guest mailed"',
     /data-email-bounced/.test(list) && /\{BOUNCE_ROW_LABEL\}/.test(list), 'data-email-bounced');
  ok('  from the shared predicate, not a hand-rolled check',
     /const bounced = isBounced\(guest\)/.test(list), 'isBounced(guest)');
  // ANCHORED TO THE BRANCH THAT HAS HISTORY. An earlier version of this check
  // matched `{bouncedLine}{optedOutLine}` anywhere, which the zero-history
  // branch satisfies on its own: dropping the line from the row that HAS send
  // history left the check green. Found by a plant.
  ok('  and it survives a guest who also asked not to be emailed',
     /<div data-send-history[\s\S]{0,200}\{bouncedLine\}[\s\S]{0,200}\{optedOutLine\}[\s\S]{0,200}shown\.map/.test(list),
     'both lines, above the history');
  ok('  including a guest who was never sent anything',
     /if \(history\.length === 0\) \{\s*return \([^)]*bounced[^)]*\)\s*\?\s*<div data-send-history/.test(list)
       && /<div data-send-history[^>]*>\{bouncedLine\}/.test(list),
     'the empty-history branch tests both');

  ok('the fix sentence is the owner’s, verbatim',
     BOUNCE_FIX_SENTENCE === 'This address bounced. Fix it, then resend.', BOUNCE_FIX_SENTENCE);
  ok('  and it sits on the address, which is the thing to fix',
     /data-bounce-fix/.test(list) && /\{BOUNCE_FIX_SENTENCE\}/.test(list), 'data-bounce-fix');
  ok('  the row’s Resend action is still there as the other half',
     /data-resend-invitation/.test(list) && /Resend invitation/.test(list), 'unchanged');

  // ── 5. The filter ─────────────────────────────────────────────────────
  ok('the Guests page counts bounced guests with the shared predicate',
     /bounced: guests\.filter\(isBounced\)\.length/.test(page), 'filterCounts.bounced');
  ok('  offers a Bounced pill carrying that count',
     /\{ val: 'bounced', label: `Bounced \(\$\{filterCounts\.bounced\}\)` \}/.test(page), 'pill');
  ok('  and the pill actually filters the list',
     /if \(activeFilter === 'bounced'\) return isBounced\(guest\);/.test(page), 'predicate');
  ok('  the pill is spent only when there is something behind it',
     /filterCounts\.bounced > 0\s*\n?\s*\? \[\{ val: 'bounced'/.test(page), 'conditional');

  // ── 6. The send modal ─────────────────────────────────────────────────
  ok('the modal’s sentence is verbatim, and counts guests',
     bouncedSkippedSentence(1) === '1 bounced, not sent.'
       && bouncedSkippedSentence(3) === '3 bounced, not sent.',
     bouncedSkippedSentence(3));
  ok('  shown before the press, not only in the result',
     /data-bounced-skipped/.test(modal)
       && /\{bouncedSkippedSentence\(bouncedSelected\.length\)\}/.test(modal),
     'in the review step');
  ok('  and the result sentence carries it too, so the gap has a cause',
     /bouncedSkippedSentence\(nBounced\)/.test(modal), 'in the toast');
  ok('a bounced guest is dropped from the send the modal performs',
     /const sendableGuests = selectedGuests\.filter\(g => !g\.email_opt_out && !isBounced\(g\)\);/.test(modal),
     'sendableGuests');
  ok('  counted separately from the ones who asked not to be emailed',
     /const bouncedSelected = selectedGuests\.filter\(isBounced\);/.test(modal)
       && /const optedOutSelected = selectedGuests\.filter\(g => g\.email_opt_out\);/.test(modal),
     'two counts');
  ok('  and no token is minted for an address the server will refuse',
     /ensureTokens\(sendableGuests\)/.test(modal), 'ensureTokens(sendableGuests)');

  // ── 7. Copy rules ─────────────────────────────────────────────────────
  const copy = [BOUNCE_ROW_LABEL, BOUNCE_FIX_SENTENCE, bouncedSkippedSentence(2)];
  ok('no em or en dash in any of the three strings',
     copy.every((s) => !/[—–]/.test(s)), copy.join(' / '));
  ok('  no exclamation mark, and nothing shouting',
     copy.every((s) => !/!/.test(s) && s !== s.toUpperCase()), copy.join(' / '));
  ok('  and US English spelling throughout',
     copy.every((s) => !/(our|ise|isation)\b/i.test(s)), copy.join(' / '));

  return results;
}
