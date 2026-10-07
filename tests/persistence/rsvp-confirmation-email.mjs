/**
 * The guest hears back, and only when there is somewhere to hear back to.
 *
 * ── WHAT WAS MISSING ───────────────────────────────────────────────────────
 *
 * api/rsvp-submit.js wrote the RsvpResponse rows, notified the couple, and
 * returned `{ ok: true }`. THE GUEST HEARD NOTHING — no acknowledgement the
 * reply landed, no record of what they said. The only way to check was to open
 * the link again and hope the form remembered.
 *
 * ── THE RULING THIS GUARDS ─────────────────────────────────────────────────
 *
 * Goal 2026-09-27 item 1, and the owner's ruling on the recipient:
 *
 *   "send only when there is a valid address. Order of preference: the address
 *   submitted in the RSVP form; if empty and the guest arrived by token, the
 *   Guest record's email; if neither, skip and count the skip in the
 *   endpoint's existing result shape. Do NOT make email required on the RSVP
 *   form — a guest with no email must still be able to reply."
 *
 * So the thing that must never break is the ORDER, and the fact that a guest
 * with no address still gets their RSVP recorded. Both are decisions over three
 * plain values, driven directly below.
 *
 * ── WHY THE SEND ITSELF IS ASSERTED AT SOURCE ──────────────────────────────
 *
 * The endpoint has no `deps` seam — api/send-invites.js and
 * api/webhooks/stripe.js do, and send-invites-result-shape.mjs uses it to drive
 * the real handler — and adding five seams to a live RSVP path is a larger
 * change than this item. What matters about the send is guarded here at source:
 * it is awaited, it is after the rows, it cannot fail the RSVP, Reply-To is the
 * couple, and a test guest gets nothing.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const read = (p) => { try { return readFileSync(root(p), 'utf8'); } catch { return ''; } };
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const EP = strip(read('api/rsvp-submit.js'));

export async function runRsvpConfirmationEmail() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  RSVP confirmation — the guest hears back:\n');

  // A PLACEHOLDER KEY, THEN RESTORE — the pattern stripe-webhook.mjs uses, and
  // for the same reason: `new Resend(process.env.RESEND_API_KEY)` runs at module
  // scope and THROWS on an empty key, so a fresh clone or CI cannot import this
  // endpoint at all without one. Nothing is sent; the constructor just needs a
  // non-empty string.
  let EP_MOD = {}; let TPL = {};
  const priorResendKey = process.env.RESEND_API_KEY;
  if (!process.env.RESEND_API_KEY) process.env.RESEND_API_KEY = 're_persistence_suite_placeholder';
  try { EP_MOD = await import('../../api/rsvp-submit.js'); } catch { /* reported */ }
  process.env.RESEND_API_KEY = priorResendKey;
  try { TPL = await import('../../src/lib/emailTemplate.js'); } catch { /* reported */ }

  // ── the wiring, at source ─────────────────────────────────────────────────
  check('the endpoint sends the guest an email', /resend\.emails\.send\(/.test(EP), 'Resend');
  check('  built from the shared template, not inline HTML',
    /renderRsvpConfirmationEmail\(/.test(EP) && !/<!DOCTYPE/.test(EP), 'one template');
  check('  Reply-To is the couple, like every other guest-facing email',
    /replyTo: ownerEmail \|\| SUPPORT_ADDRESS/.test(EP), 'the couple, then support');
  check('  From wears the couple’s name on the support address',
    /from: `\$\{fromName\} <\$\{SUPPORT_ADDRESS\}>`/.test(EP), 'looks like it came from them');
  check('the send is AWAITED — a frozen function is not a send',
    /await resend\.emails\.send\(/.test(EP), 'awaited');
  check('  and it is after the rows are written and the couple notified',
    EP.indexOf('resend.emails.send') > EP.indexOf('createRsvpResponse({')
      && EP.indexOf('resend.emails.send') > EP.indexOf('await notify('), 'ordered');
  check('  a failed email can never fail the RSVP',
    /catch \(mailErr\)/.test(EP) && /confirmation = 'failed'/.test(EP), 'caught and counted');
  // RE-POINTED 2026-10-03, per-event invitations item 4. This pinned the
  // response object exactly as `{ ok: true, confirmation }`, and the endpoint
  // now also returns `dropped`: the number of submitted event rows that were
  // thrown away because the guest is not invited to that event. The property
  // this check is for, that the response COUNTS what happened rather than
  // answering a bare ok, is the reason the new key exists, so the assertion
  // names the two keys it is about and allows the shape to grow.
  // KEYS, NOT A LINE. This read the one-line literal `{ ok: true, confirmation`
  // and broke when the object gained members_written/members_rejected, with
  // the property it is about untouched. A response shape is a set of keys.
  check('the result shape counts what happened',
    /return res\.status\(200\)\.json\(\{[\s\S]{0,400}?ok: true,[\s\S]{0,400}?confirmation[,\s}]/.test(EP),
    'ok + confirmation');
  check('  including a skip, which the ruling asked for',
    /confirmation = 'skipped'/.test(EP) && /confirmation = 'skipped-test'/.test(EP), 'skipped / skipped-test');
  check('a test guest gets nothing — never on the couple’s own preview',
    /if \(guest\.is_test\)/.test(EP), 'is_test');
  check('email is NOT made required on the form — a guest with no address still replies',
    !/email is required/i.test(EP) && /const email = submittedEmail && isValidEmail/.test(EP),
    'optional, as ruled');

  // ── the recipient order, driven ───────────────────────────────────────────
  const pick = EP_MOD.confirmationRecipient;
  check('the recipient decision is exported so it can be driven',
    typeof pick === 'function', 'confirmationRecipient');
  if (typeof pick === 'function') {
    const guest = { email: 'onfile@example.com', plus_one_email: 'plus@example.com' };
    check('the submitted address wins',
      pick({ submittedEmail: 'typed@example.com', guest, isPlusOne: false }) === 'typed@example.com', 'typed');
    check('  with no submitted address, the Guest record’s is used',
      pick({ submittedEmail: '', guest, isPlusOne: false }) === 'onfile@example.com', 'on file');
    check('  a plus-one gets their OWN address, not the primary guest’s',
      pick({ submittedEmail: '', guest, isPlusOne: true }) === 'plus@example.com', 'theirs');
    check('  neither means skip, not a throw',
      pick({ submittedEmail: '', guest: {}, isPlusOne: false }) === '', 'empty string');
    check('  and a malformed address on file is not an address',
      pick({ submittedEmail: '', guest: { email: 'not-an-email' }, isPlusOne: false }) === '', 'validated');
    check('  a guest object that is missing entirely does not throw',
      pick({ submittedEmail: '', guest: null, isPlusOne: false }) === '', 'null-safe');
  }

  // ── the copy, verbatim ────────────────────────────────────────────────────
  const render = TPL.renderRsvpConfirmationEmail;
  check('the confirmation template exists', typeof render === 'function', 'renderRsvpConfirmationEmail');
  if (typeof render === 'function') {
    const yes = render({ coupleNames: 'Ada & Alan', guestName: 'Grace Hopper', attending: true,
      eventName: 'Ceremony', date: '2027-07-03', venueName: 'The Old Observatory', universeId: 'london' });
    check('the subject is the owner’s line',
      yes.subject === 'Your reply to Ada & Alan is in', yes.subject);
    check('  it greets the first name only', /^Hi Grace,/.test(yes.text), yes.text.split('\n')[0]);
    check('  an attending guest reads "You’re coming — lovely."',
      yes.text.includes("You're coming — lovely."), 'verbatim');
    check('  the event line carries name, date and venue',
      /Ceremony · .*2027 · The Old Observatory/.test(yes.text), 'all three');
    check('  and the last line says where a reply goes',
      yes.text.trim().endsWith('Replying to this email goes straight to Ada & Alan.'), 'verbatim');

    const no = render({ coupleNames: 'Ada & Alan', guestName: 'Grace', attending: false,
      eventName: 'Welcome drinks', venueName: 'The pub', universeId: 'london' });
    check('a declining guest reads "You can’t make it — they’ll miss you."',
      no.text.includes("You can't make it — they'll miss you."), 'verbatim');
    check('  and an event with NO DATE drops the middle line entirely',
      !no.text.includes('Welcome drinks') && !no.text.includes('The pub'),
      'no "Ceremony · · venue"');

    check('it is a receipt, not an invitation — no CTA and no banner',
      !/href=/.test(yes.html) && !/<img[^>]*banner/i.test(yes.html), 'no link, no banner');
    check('  no emoji, as ruled',
      !/️|[\u{1F300}-\u{1FAFF}]/u.test(yes.text + no.text), 'none');
    check('  and it takes the couple’s universe, so it looks like their other email',
      /getUniverseEmailStyle\(universeId\)/.test(read('src/lib/emailTemplate.js')), 'shared palette');
  }

  return results;
}
