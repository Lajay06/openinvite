/**
 * tests/persistence/resend-and-history.mjs
 *
 * ONE GUEST, THE SAME FLOW, AND A HISTORY THAT IS APPENDED.
 *
 * Item 5 of goals/2026-10-09-reply-lifecycle.md.
 *
 * ── THE TWO FAILURES THIS EXISTS TO STOP ─────────────────────────────────
 *
 * RESENDING TO MORE THAN ONE PERSON. The owner's guard is that the flow opens
 * with EXACTLY ONE guest selected. A row action that opened the send page with
 * the whole list selected, or with the list's current filter applied, would
 * look identical until the couple pressed send, and then it would have mailed
 * everybody.
 *
 * A HISTORY THAT IS REWRITTEN RATHER THAN APPENDED. Guest.send_history's
 * contract is append-only: the guest's existing entries are spread and the new
 * one goes on the end. A write that replaced the array would silently delete
 * every earlier send, and nothing on screen would say so, because the cell
 * shows what the field holds.
 *
 * ── AND THE FIELD DID NOT EXIST UNTIL TODAY ──────────────────────────────
 *
 * Every guest predating it has none, so sendHistoryFor derives the first lines
 * from invite_sent_at and reminder_sent_at, which is the owner's ruling. That
 * derivation is tested as hard as the stored path, because it is what every
 * real customer sees for now.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { sendHistoryFor, sendTypeLabel, newSendEntry, hashRecipient } from '../../src/lib/sendHistory.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

export async function runResendAndHistory() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const eq = (label, got, want) => {
    const a = JSON.stringify(got), b = JSON.stringify(want);
    results.push(a === b ? pass(label, a) : fail(label, b, a));
  };

  // ── 1. THE STORED HISTORY IS THE WHOLE ANSWER WHEN IT EXISTS ────────────
  const stored = sendHistoryFor({
    send_history: [
      { type: 'invite', sent_at: '2026-09-01T10:00:00Z', to_hash: 'aa' },
      { type: 'reminder', sent_at: '2026-10-02T10:00:00Z', to_hash: 'aa' },
    ],
    // PRESENT AND IGNORED. Splicing the two sources would double-count the
    // send that transitioned between them.
    invite_sent_at: '2020-01-01T00:00:00Z',
    reminder_sent_at: '2020-01-02T00:00:00Z',
  });
  eq('a stored history is used, newest first', stored.map((e) => e.label), ['Reminder', 'Invitation']);
  ok('  and the old stamps are ignored rather than merged in',
     stored.length === 2 && !stored.some((e) => String(e.sent_at).startsWith('2020')), 'two entries, none from 2020');

  // ── 2. DERIVED, FOR EVERY GUEST WHO PREDATES THE FIELD ──────────────────
  eq('with no stored history, the two stamps are derived, newest first',
     sendHistoryFor({ invite_sent_at: '2026-09-01T10:00:00Z', reminder_sent_at: '2026-10-01T10:00:00Z' })
       .map((e) => e.label),
     ['Reminder', 'Invitation']);
  eq('  an invitation alone derives one line',
     sendHistoryFor({ invite_sent_at: '2026-09-01T10:00:00Z' }).map((e) => e.label), ['Invitation']);
  // THE GOAL'S OWN WORDING: if it is only invitation_sent, show "Invitation
  // sent" with no date.
  const flagOnly = sendHistoryFor({ invitation_sent: true });
  ok('a bare invitation_sent flag shows an invitation with no date',
     flagOnly.length === 1 && flagOnly[0].label === 'Invitation' && flagOnly[0].sent_at === null,
     JSON.stringify(flagOnly));
  eq('a guest nothing was sent to has no history at all', sendHistoryFor({}), []);
  ok('  and neither does a null guest, rather than throwing',
     sendHistoryFor(null).length === 0, 'empty');
  // An entry with no timestamp still counts as a send, and sorts last.
  const mixed = sendHistoryFor({ send_history: [
    { type: 'invite' }, { type: 'reminder', sent_at: '2026-10-02T10:00:00Z' },
  ] });
  eq('an entry with no timestamp is kept, and sorts last', mixed.map((e) => e.label), ['Reminder', 'Invitation']);

  ok('an unknown type is shown, not hidden', sendTypeLabel('weird_thing') === 'weird thing', sendTypeLabel('weird_thing'));
  ok('  and the owner\'s types read in sentence case',
     sendTypeLabel('save_the_date') === 'Save the date' && sendTypeLabel('reminder') === 'Reminder', 'labels');

  // ── 3. THE HASH IS A HASH, AND NEVER THE ADDRESS ────────────────────────
  const h1 = await hashRecipient(' Ada@Example.com ');
  const h2 = await hashRecipient('ada@example.com');
  ok('the recipient hash normalizes case and whitespace', h1 === h2 && h1.length === 64, `${h1.slice(0, 12)}…`);
  ok('  and never contains the address', !h1.includes('ada') && !h1.includes('@'), 'no address in it');
  ok('  a different address hashes differently',
     (await hashRecipient('bob@example.com')) !== h1, 'distinct');
  ok('  no address yields no hash, rather than hashing an empty string',
     (await hashRecipient('')) === '' && (await hashRecipient(null)) === '', 'empty');

  const entry = await newSendEntry('reminder', 'a@b.c', new Date('2026-10-09T09:00:00Z'));
  eq('a new entry is exactly type, sent_at and to_hash', Object.keys(entry).sort(), ['sent_at', 'to_hash', 'type']);
  ok('  with no plaintext address key', !('to' in entry) && !('email' in entry), 'no address key');
  ok('  and the timestamp is the send time it was given', entry.sent_at === '2026-10-09T09:00:00.000Z', entry.sent_at);

  // ── 4. EXACTLY ONE GUEST, THROUGH THE EXISTING FLOW ─────────────────────
  const guests = code('src/pages/Guests.jsx');
  ok('the row\'s resend handler selects exactly one guest',
     /goToSend\(\{ initialSelectedIds: \[guest\.id\], type: 'invite' \}\)/.test(guests),
     'one id');
  ok('  and it is wired to the list', /onResend=\{readOnly \? undefined : handleResend\}/.test(guests), 'onResend');
  const list = code('src/components/guests/GuestList.jsx');
  ok('  the row menu offers it', /data-resend-invitation/.test(list) && /onResend\(guest\)/.test(list), 'menu item');
  ok('  and hides it when the page is read-only',
     /\{onResend && \(/.test(list), 'gated on the prop');

  // THE FLOW IS THE EXISTING ONE. No second send path, and no api change,
  // which the goal set as an explicit stop condition.
  const modal = code('src/components/guests/SendInvitesModal.jsx');
  ok('the send page seeds its selection from initialSelectedIds',
     /initialSelectedIds\?\.length \? new Set\(initialSelectedIds\) : new Set\(\)/.test(modal), 'seeded');
  ok('  and does not then auto-select over it',
     /skipNextAutoSelect = useRef\(!!initialSelectedIds\?\.length\)/.test(modal), 'auto-select skipped');
  ok('no api/send-*.js change was needed',
     /initialSelectedIds/.test(read('src/pages/SendInvites.jsx')), 'router state already passed through');

  // ── 5. APPENDED, NEVER REWRITTEN ────────────────────────────────────────
  const appends = (modal.match(/send_history: \[\.\.\.\(Array\.isArray\(g\.send_history\) \? g\.send_history : \[\]\), historyById\.get\(g\.id\)\]/g) || []).length;
  ok('every send_history write spreads the existing entries first', appends === 2, `${appends} of 2 write sites`);
  ok('  and no write assigns a bare array',
     !/send_history: \[historyById/.test(modal) && !/send_history: \[\]/.test(modal), 'no replacement');
  ok('  the entry is built by the shared helper, not inline',
     /newSendEntry\(type, g\.email, new Date\(sentAt\)\)/.test(modal), 'newSendEntry');
  // EVERY TYPE, not just the two with a stamp.
  ok('the types that had no stamp are recorded too',
     /} else \{[\s\S]{0,600}send_history: \[\.\.\./.test(modal), 'update, save-the-date, thank-you');

  // ── 6. THE ROW SHOWS IT, AND THE CHANNEL ICON IS GONE ───────────────────
  ok('the row renders the history', /data-send-history/.test(list) && /sendHistoryFor\(guest\)/.test(list), 'cell');
  ok('  through the dashboard date formatter',
     /fmtDate\(e\.sent_at\)/.test(list), 'fmtDate');
  ok('  and shows nothing sent as "Not sent"', /Not sent/.test(list), 'Not sent');
  // #924 left one channel, so an icon that can only say one thing is not
  // information. The stored legacy values are untouched; only the icon went.
  ok('the channel icon row is gone, with its maps',
     !/CHANNEL_ICONS/.test(list) && !/CHANNEL_LABELS/.test(list), 'removed');
  ok('  and no orphaned icon import was left behind',
     !/MessageCircle/.test(list), 'MessageCircle gone');

  return results;
}
