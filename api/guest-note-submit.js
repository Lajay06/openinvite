/**
 * POST /api/guest-note-submit
 *
 * Public, unauthenticated endpoint backing the "Send a note" form on the
 * couple's guest site. One GuestMessage row per submission, plus a bell
 * notification for the couple.
 *
 * WHAT THE COUPLE COULD DO BEFORE THIS: nothing. The Messages page's empty
 * state promised notes "through the guest portal" and no code anywhere in this
 * repo had ever created a GuestMessage — the route was described and never
 * built. A guest's only way to ask a question was to reply to an invitation
 * email, which works and is kept, but leaves nothing on the dashboard.
 *
 * THE PROTECTION SET IS api/song-request-submit.js's, in the same order and
 * for the same reasons: CORS, method, per-IP rate limit, body-only password
 * (#449 — never a query string, which reaches access logs, history, referrers
 * and shared-cache keys), sanitizeString with explicit caps, required-field
 * 400, Turnstile, then, inside the try: resolve the wedding by slug, the
 * website password gate, and only then the write.
 *
 * WHAT IS STORED, AND WHAT IS NOT:
 *   guest_name       the guest's FIRST name, plain text — the Messages list
 *                    needs something to show, and a first name alone is what
 *                    the couple needs to recognise them.
 *   encrypted_guest  the address and the message text, AES-256-GCM
 *                    (api/_lib/guestNotePii.js). GuestMessage.read RLS is
 *                    null, so any authenticated account can list this entity;
 *                    the blob is why that yields nothing.
 *   guest_email      NEVER WRITTEN. Still declared, because undeclaring a
 *                    field drops its stored data.
 *   message          NEVER WRITTEN, same reason.
 *   wedding_id       the wedding this note belongs to, stamped server-side
 *                    from the row we just resolved — never supplied by the
 *                    guest. This is the ONLY thing that scopes the note to a
 *                    couple: created_by_id is 'anonymous' on every row Base44
 *                    writes for the admin key, so api/guest-notes.js matches
 *                    on wedding_id instead.
 *
 * Body: { weddingSlug, turnstileToken, name, email, message, password? }
 * Response: 200 { ok: true }
 *        or 400 { error } (missing field, bad address, missing/failed Turnstile)
 *        or 403 { error, passwordRequired: true } (website password gate)
 *        or 404 { error: 'Wedding not found.' }
 *        or 429 { error } (rate limit)
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  sanitizeString,
  isValidEmail,
  normalizeEmail,
  verifyTurnstileToken,
} from './_lib/security.js';
import { guestGateBlocks, GUEST_GATE_MESSAGE } from './_lib/guestSafeWedding.js';
import { resolveWeddingBySlug } from './_lib/resolveWeddingBySlug.js';
import { adminList, adminCreate, hasAdminKey } from './_lib/base44Entities.js';
import { buildGuestNoteBlob } from './_lib/guestNotePii.js';
import { firstNameOrNull } from '../src/lib/emailGreeting.js';
import { notify } from './_lib/notify.js';
import { Resend } from 'resend';
import { getBase44User } from './_lib/base44Admin.js';
import { guestNoteEmail } from './_lib/guestNoteNotification.js';
import { TOO_MANY_TRIES, DID_NOT_GO_THROUGH } from './_lib/calmErrors.js';

/** The goal's cap. A note is a question, not an essay; 1000 characters is generous for one. */
const MAX_MESSAGE_LENGTH = 1000;
const LOG = '[guest-note-submit]';
const FROM = 'Openinvite <hello@openinvite.com.au>';

/**
 * Item 4 of goals/2026-10-10-bounces-and-notes.md: one email to the couple's
 * account address for each note.
 *
 * THE NOTE IS ALREADY STORED WHEN THIS RUNS, and that decides every branch
 * below. A guest pressed send, the row exists, the bell has rung. Nothing
 * here may turn that into an error the guest sees, so every failure is logged
 * and returned as a reason rather than thrown, and the caller does not wait
 * on it to decide the response.
 *
 * THE ADDRESS COMES FROM THE ACCOUNT, NOT FROM THE WEDDING ROW. The couple's
 * own address is on the User, and the User entity needs the ?api_key= form
 * rather than a bearer header: see BASE44_PLATFORM_NOTES.md. getBase44User
 * already does that, and is used by the Stripe webhook, so this inherits a
 * path that is known to work rather than opening a second one.
 *
 * EVERY DEPENDENCY IS INJECTABLE, so the guard can drive the real decisions
 * with no network, no key and no Resend client.
 *
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function sendNoteNotification({ wedding, guestName, message }, deps = {}) {
  const getUser = deps.getUser
    || ((id) => getBase44User(id, process.env.BASE44_ADMIN_KEY));
  const render = deps.render || guestNoteEmail;
  // The client is built at call time, never at module scope: new Resend(undefined)
  // THROWS, so a module-level client would take down every import of this file
  // in any environment without the key, the guard included.
  const send = deps.send
    || ((payload) => new Resend(process.env.RESEND_API_KEY).emails.send(payload));

  // is_test skips, per the item. A test wedding's notes are the owner's own
  // probes and an email for each one is noise in his inbox.
  if (wedding?.is_test) {
    console.log(`${LOG} test wedding, no note email sent`);
    return { sent: false, reason: 'is_test' };
  }

  const ownerId = wedding?.created_by_id;
  if (!ownerId) {
    console.error(`${LOG} FAILURE: the wedding has no owner id, no note email sent`);
    return { sent: false, reason: 'no_owner' };
  }

  let user = null;
  try {
    user = await getUser(ownerId);
  } catch (err) {
    console.error(`${LOG} FAILURE: could not read the account for the note email: ${err.message}`);
    return { sent: false, reason: 'user_read_failed' };
  }
  const to = String(user?.email || '').trim();
  if (!to) {
    // NOT AN ERROR THE GUEST CAUSED, and not one the couple can fix from here.
    // The note is on their Messages page either way, which is the sentence the
    // email would have pointed them to.
    console.warn(`${LOG} no account address for the owner, no note email sent`);
    return { sent: false, reason: 'no_address' };
  }

  const email = render({ guestName, message });
  try {
    await send({
      from: FROM,
      to,
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    console.log(`${LOG} note email sent to the couple`);
    return { sent: true };
  } catch (err) {
    console.error(`${LOG} FAILURE: the note email did not send: ${err.message}`);
    return { sent: false, reason: 'send_failed' };
  }
}
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 200;

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  // DELIBERATELY song-request-submit.js's number, not a stricter one. Guests at
  // a venue share one wifi NAT, so a per-IP limit is a per-table limit; 10 a
  // minute stops a script and does not stop a wedding party.
  const { limited, remaining } = checkRateLimit(ip, 'guest-note', 10, 60_000);
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: TOO_MANY_TRIES });
  }

  const weddingSlug = sanitizeString(req.body?.weddingSlug || '');
  // Body only, never a query string (#449).
  const candidatePassword = typeof req.body?.password === 'string' ? req.body.password : '';
  const name = sanitizeString(req.body?.name || '').slice(0, MAX_NAME_LENGTH);
  // NORMALIZED BEFORE IT IS JUDGED. A guest who pastes their address out of a
  // mailto link sends "mailto:them@example.com", and the old validator accepted
  // it — so it was encrypted, stored, and later handed to Resend as a recipient,
  // which refused it. The couple's reply then failed with "Something went wrong"
  // and the Messages row printed the prefix as part of the address. Stripping
  // the scheme is kinder than refusing a guest over a paste.
  const email = normalizeEmail(sanitizeString(req.body?.email || '')).slice(0, MAX_EMAIL_LENGTH);
  const message = sanitizeString(req.body?.message || '').slice(0, MAX_MESSAGE_LENGTH);
  const turnstileToken = req.body?.turnstileToken;

  if (!weddingSlug || !name || !email || !message) {
    return res.status(400).json({ error: 'Your name, email, and a message are all required.' });
  }

  // THE ADDRESS IS REQUIRED HERE AND NOWHERE ELSE ON THE GUEST SITE. The form
  // tells the guest "{couple} will reply to {email}", and the couple's reply
  // goes out by email — a note with no usable address is a promise the product
  // cannot keep, so it is refused at the door rather than accepted and dropped.
  // (The RSVP form is the opposite case and stays that way: a guest with no
  // email must still be able to reply.)
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Check your email address. The couple will reply to it.' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  if (!hasAdminKey()) {
    console.error('[guest-note-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip, '[guest-note-submit]');
  } catch (err) {
    console.error('[guest-note-submit] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }
  if (!turnstileResult.success) {
    console.warn('[guest-note-submit] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
    return res.status(400).json({ error: 'Security verification failed. Please refresh the page and try again.' });
  }

  try {
    const rows = await adminList('WeddingDetails', { slug: weddingSlug });
    const resolved = resolveWeddingBySlug(rows, weddingSlug, { context: 'guest-note-submit' });
    // Ambiguity and an empty slug both refuse here rather than being handed
    // whichever row sorted first. The guest never sees why.
    const wedding = resolved.ok ? resolved.wedding : null;
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found.' });
    }

    // The website password gate, before the write. Turnstile proves "not a
    // bot"; this proves "allowed to be here at all".
    if (await guestGateBlocks(wedding, candidatePassword, '[guest-note-submit]')) {
      return res.status(403).json({ error: GUEST_GATE_MESSAGE, passwordRequired: true });
    }

    // NULL RATHER THAN A PLACEHOLDER when the name field holds an address:
    // firstNameOrNull exists because the product once greeted the owner with
    // his own email address. A note from a guest who typed one reads as "A
    // guest" in the list, which is true, rather than printing the address the
    // blob exists to keep out of plain text.
    const firstName = firstNameOrNull(name) || '';

    await adminCreate('GuestMessage', {
      wedding_id: wedding.id,
      guest_name: firstName,
      encrypted_guest: buildGuestNoteBlob({ email, message }),
      channel: 'in_app',
      read: false,
      replied: false,
    });

    // AWAITED, not fire-and-forget: a Vercel function can freeze the moment the
    // response is sent, so background work is not guaranteed to finish. notify()
    // swallows and logs its own errors, so this cannot turn a stored note into a
    // failed response.
    //
    // type: 'system'. Notification.type is an enum of five values and none of
    // them is a note — adding one is a schema change, which this goal's stop
    // conditions reserve for the owner. 'system' renders the Info icon in the
    // bell and, having no instant-email preference, sends no email: the note
    // itself is what the couple reads, on the page the link opens.
    //
    // THE MESSAGE TEXT IS NOT IN THE NOTIFICATION. Notification has no
    // encrypted field, so a body carrying the note would write the guest's
    // sentence back into plain text one entity over and undo the blob.
    await notify({
      recipientUserId: wedding.created_by_id,
      type: 'system',
      title: firstName ? `New note from ${firstName}` : 'New note from a guest',
      link: '/Messages',
    });

    // AWAITED, like notify() above and for the same reason: a Vercel function
    // can freeze the moment the response is sent. It cannot fail the response,
    // because it returns a reason rather than throwing.
    //
    // THE PLAINTEXT IS THE ONE WE WERE HANDED, never the blob read back. The
    // blob keeps the sentence out of plain text in Base44, where any
    // authenticated account can list the entity; it was never meant to keep
    // the note from the couple it was written to.
    await sendNoteNotification({ wedding, guestName: firstName, message });

    console.log('[guest-note-submit] Note created for wedding', weddingSlug);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[guest-note-submit] Error:', err.message);
    return res.status(500).json({ error: DID_NOT_GO_THROUGH });
  }
}
