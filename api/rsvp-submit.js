/**
 * POST /api/rsvp-submit
 *
 * Public, unauthenticated endpoint backing RSVPPage.jsx's RSVP form
 * submission. Validates the rsvp_link_id token server-side (resolving the
 * guest exactly as api/rsvp-lookup.js does — never a client-supplied guest
 * id), derives the overall rsvp_status from the submitted per-event
 * responses using the exact same rule RSVPPage.jsx used to apply
 * client-side, and writes RsvpResponse rows with the server-side admin key
 * — NOT Guest.update(), which 403s (Guest gained an owner-scoped update RLS
 * rule the admin key structurally cannot satisfy — same root cause as the
 * poll-vote breaks fixed in fix/poll-entities-migration). Per-event data
 * (status/meal_choice/plus_ones/plus_one_names) writes one row per event_id;
 * whole-submission data (song_request/rsvp_note/dietary_restrictions) writes
 * one additional row with event_id: null. Append-only, same reason as
 * PollVote — a guest resubmitting creates new rows; latest-wins aggregation
 * (src/lib/rsvpAggregation.js) determines current state. SMART_RSVP_MODEL.md
 * documents why this supersedes its original "leave Guest fields as-is"
 * guidance.
 *
 * Body: {
 *   token: string,
 *   event_responses: Array<{ event_id, status, meal_choice?, plus_ones?, plus_one_names?, responded_at? }>,
 *   song_request?: string, rsvp_note?: string, dietary_restrictions?: string, email?: string,
 * }
 *
 * email is optional and never blocks submission — an invalid or missing
 * value is just dropped from the guest-level row, same tolerant handling
 * as the other free-text fields. "Don't overwrite an existing Guest.email"
 * is enforced at READ time (api/my-guests-rsvp.js's overlay prefers the
 * real Guest.email whenever it's set), not here — Guest.email itself is
 * never touched by this endpoint, so there is nothing here that could
 * overwrite it even by mistake.
 *
 * feat/plus-one-identity: resolveGuestByToken's `role` says whether this
 * submission is the primary guest's own or their plus-one's (same
 * underlying guest_id either way — there's no separate Guest record for a
 * plus-one). Rows are stamped is_plus_one accordingly, which is what keeps
 * the two sets of answers from colliding under latest-wins aggregation
 * (src/lib/rsvpAggregation.js).
 *
 * fix/rsvp-response-encryption (PR 1a): RsvpResponse has create:null/
 * read:null (see BASE44_PLATFORM_NOTES.md — the admin key can never satisfy
 * an owner-scoped RLS rule on this write path), and a direct unauthenticated
 * request confirmed it was listable in full — 2010+ rows across 472
 * weddings, real emails/dietary/notes/song requests in plaintext. guest_id
 * is now stored as guest_id_hash (HMAC, api/_lib/questionnaireCrypto.js
 * hashId — same construction as QuestionnaireResponse), and the four
 * guest-level text fields are bundled into one encrypted_guest_level blob
 * (AES-256-GCM, encryptPayload) instead of four plaintext columns. An
 * unscoped list of this entity now yields only hashes and ciphertext.
 *
 * Response: 200 { ok: true }
 *        or 404 { error: 'This link has expired or is invalid.' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { Resend } from 'resend';
import { applyCors, checkRateLimit, getClientIp, sanitizeString, isValidEmail } from './_lib/security.js';
import { renderRsvpConfirmationEmail } from '../src/lib/emailTemplate.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { notify } from './_lib/notify.js';
// THE COUPLE'S ADDRESS, FOR Reply-To. WeddingDetails carries no email — the
// couple's address lives on the User entity — so this is the only way to make
// a guest's reply reach them. Same helper, same purpose, as
// api/rsvp-link-request.js:220; notify() already calls it from this request.
import { getBase44User } from './_lib/base44Admin.js';
// THE COUPLE'S NAME, THROUGH THE ONE READER. test:couple-names bars reading
// `coupleNames` off the record directly, and it is right to: the display name
// has a fallback chain (coupleNames, then couple1Name & couple2Name) and a
// sender that read the field raw would print an empty string for any wedding
// that only has the two halves.
import { coupleDisplayName } from './_lib/coupleNames.js';
import { hashId, encryptPayload } from './_lib/questionnaireCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

const MAX_TEXT_LENGTH = 1000;

// Same Resend/FROM shape as api/send-invites.js and api/send-guest-reply.js.
const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_ADDRESS = 'hello@openinvite.com.au';

/**
 * WHERE THE CONFIRMATION GOES, in the owner's order of preference.
 *
 * Goal 2026-09-27 item 1: "the address submitted in the RSVP form; if empty and
 * the guest arrived by token, the Guest record's email; if neither, skip".
 *
 * Every caller here arrived by token — resolveGuestByToken is the only way in —
 * so the second clause is really "the address the couple has on file". A
 * plus-one replying gets their own, not the primary guest's: they are a
 * different person and the reply belongs to them.
 *
 * NO EMAIL IS NOT AN ERROR. A guest with no address must still be able to
 * reply, which the owner ruled explicitly, so this returns '' and the caller
 * counts the skip.
 *
 * EXPORTED so a guard can drive the decision without a network call. The
 * endpoint has no `deps` seam (unlike api/send-invites.js and
 * api/webhooks/stripe.js) and adding five of them to a live RSVP path is a
 * bigger change than this item; the DECISION is what the ruling is about, and
 * it is a function of three plain values.
 */
export function confirmationRecipient({ submittedEmail, guest, isPlusOne }) {
  if (submittedEmail) return submittedEmail;
  const onFile = isPlusOne ? guest?.plus_one_email : guest?.email;
  const clean = sanitizeString(onFile || '').trim();
  return clean && isValidEmail(clean) ? clean : '';
}
const VALID_STATUSES = new Set(['yes', 'no', 'pending']);

/**
 * Sanity-checks and sanitizes the submitted per-event responses. Malformed
 * entries are dropped rather than rejecting the whole submission — a
 * client bug in one event's form state shouldn't block a guest's response
 * to the events they filled in correctly.
 */
function sanitizeEventResponses(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter(r => r && typeof r.event_id === 'string' && r.event_id)
    .map(r => ({
      event_id: sanitizeString(r.event_id),
      invited: true,
      status: VALID_STATUSES.has(r.status) ? r.status : 'pending',
      meal_choice: r.status === 'yes' ? (sanitizeString(r.meal_choice || '') || null) : null,
      plus_ones: r.status === 'yes' && Number(r.plus_ones) > 0 ? 1 : 0,
      plus_one_names: r.status === 'yes' && Array.isArray(r.plus_one_names)
        ? r.plus_one_names.map(sanitizeString).filter(Boolean).slice(0, 1)
        : [],
      responded_at: typeof r.responded_at === 'string' ? r.responded_at : new Date().toISOString(),
    }));
}

async function createRsvpResponse(payload) {
  const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/RsvpResponse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 RsvpResponse create failed (${res.status}): ${body.slice(0, 200)}`);
  }
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'rsvp-submit', 15, 60_000);
  res.setHeader('X-RateLimit-Limit', '15');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const token = sanitizeString(req.body?.token || '');
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[rsvp-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const eventResponses = sanitizeEventResponses(req.body?.event_responses);
  const songRequest = sanitizeString(req.body?.song_request || '').slice(0, MAX_TEXT_LENGTH);
  const rsvpNote = sanitizeString(req.body?.rsvp_note || '').slice(0, MAX_TEXT_LENGTH);
  const dietaryRestrictions = sanitizeString(req.body?.dietary_restrictions || '').slice(0, MAX_TEXT_LENGTH);
  const submittedEmail = sanitizeString(req.body?.email || '').trim();
  const email = submittedEmail && isValidEmail(submittedEmail) ? submittedEmail : '';

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding, role } = resolved;
    const isPlusOne = role === 'plus_one';
    const guestIdHash = hashId(guest.id);

    // One row per submitted event (append-only — an event this submission
    // didn't touch simply gets no new row, and its previous latest row still
    // stands under latest-wins aggregation). Plus exactly one guest-level
    // row (event_id: null) for the whole-submission text fields, written
    // unconditionally (even if empty) so a guest clearing a previous song
    // request/note/dietary entry is itself the new latest value.
    await Promise.all([
      ...eventResponses.map(r => createRsvpResponse({
        wedding_id: wedding.id,
        guest_id_hash: guestIdHash,
        is_plus_one: isPlusOne,
        event_id: r.event_id,
        status: r.status,
        meal_choice: r.meal_choice,
        plus_ones: r.plus_ones,
        plus_one_names: r.plus_one_names,
      })),
      createRsvpResponse({
        wedding_id: wedding.id,
        guest_id_hash: guestIdHash,
        is_plus_one: isPlusOne,
        event_id: null,
        encrypted_guest_level: encryptPayload({
          song_request: songRequest,
          note: rsvpNote,
          dietary_restrictions: dietaryRestrictions,
          email,
        }),
      }),
    ]);

    console.log('[rsvp-submit] RSVP recorded for token', token.slice(0, 8) + '…');

    // Awaited (not fire-and-forget) — a Vercel serverless function can
    // freeze right after the response is sent, so background work isn't
    // guaranteed to finish. notify() already swallows and logs its own
    // errors internally, so this can never turn a successful RSVP into a
    // failed response even if the notification/email step has trouble.
    const attendingCount = eventResponses.filter(r => r.status === 'yes').length;
    const declinedCount = eventResponses.filter(r => r.status === 'no').length;
    const responseSummary = attendingCount > 0
      ? `Attending${eventResponses.length > 1 ? ` (${attendingCount} of ${eventResponses.length} events)` : ''}`
      : declinedCount > 0 ? 'Declined' : 'Responded';
    await notify({
      recipientUserId: wedding.created_by_id,
      type: 'rsvp_received',
      title: isPlusOne
        ? `${guest.plus_one_name || `${guest.name}'s plus-one`} responded`
        : `New RSVP from ${guest.name}`,
      body: responseSummary,
      link: '/Guests',
      emailCta: 'View guest list',
    });

    // ── THE GUEST'S OWN RECEIPT ────────────────────────────────────────────
    //
    // Goal 2026-09-27 item 1. Reply-To is the couple, like every other
    // guest-facing email we send; From is the support address wearing the
    // couple's name, so it arrives looking like it came from them.
    //
    // AFTER the rows are written and the couple is notified, and awaited for
    // the same reason notify() is: a Vercel function can freeze the moment it
    // responds, so fire-and-forget is not a send.
    //
    // NOTHING HERE CAN FAIL THE RSVP. The reply is already saved; a bounced
    // confirmation must not turn a successful submit into an error the guest
    // sees and retries.
    let confirmation = 'skipped';
    const recipient = confirmationRecipient({ submittedEmail: email, guest, isPlusOne });
    // Falls back to the support address if the lookup fails, exactly as
    // rsvp-link-request does — a confirmation with a support Reply-To is worth
    // more than no confirmation.
    const owner = recipient ? await getBase44User(wedding.created_by_id, BASE44_ADMIN_KEY).catch(() => null) : null;
    const ownerEmail = owner?.email || '';

    // NEVER ON THE COUPLE'S OWN PREVIEW. A test guest row is the preview path;
    // a couple walking their own flow does not need a receipt for it.
    //
    // THE LIMIT, STATED: if a couple previews using a REAL guest's token we
    // cannot tell that apart from the guest replying, and should not try —
    // guessing would mean withholding a receipt from a guest who earned one.
    if (guest.is_test) {
      confirmation = 'skipped-test';
    } else if (!recipient) {
      // Not an error. A guest with no address can still reply; they just have
      // no inbox for us to confirm it to.
      console.log('[rsvp-submit] no address for a confirmation — skipping');
    } else {
      try {
        const coupleName = coupleDisplayName(wedding);
        const attending = eventResponses.some(r => r.status === 'yes');
        const firstEvent = eventResponses[0] || null;
        const { subject, html, text } = renderRsvpConfirmationEmail({
          universeId: wedding.activeUniverse,
          coupleNames: coupleName,
          guestName: isPlusOne ? (guest.plus_one_name || guest.name) : guest.name,
          attending,
          eventName: firstEvent?.event_id === 'main-ceremony' ? 'Ceremony'
            : firstEvent?.event_id === 'reception' ? 'Reception' : '',
          date: wedding.weddingDate || '',
          venueName: wedding.mainCeremony?.venueName || '',
          design: wedding.emailDesign,
        });
        const fromName = coupleName || 'Openinvite';
        await resend.emails.send({
          from: `${fromName} <${SUPPORT_ADDRESS}>`,
          to: recipient,
          replyTo: ownerEmail || SUPPORT_ADDRESS,
          subject,
          html,
          text,
        });
        confirmation = 'sent';
      } catch (mailErr) {
        // Logged, never surfaced — see above.
        console.error('[rsvp-submit] confirmation email failed:', mailErr.message);
        confirmation = 'failed';
      }
    }

    return res.status(200).json({ ok: true, confirmation });
  } catch (err) {
    console.error('[rsvp-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
