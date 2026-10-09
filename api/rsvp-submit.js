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
 *   members?: Array<{ ref: string, event_responses: Array<same shape> }>,
 *     // item 5 of goals/2026-10-07-households-and-children.md: a LEAD replying
 *     // for the rest of their household. `ref` is the opaque per-member handle
 *     // api/rsvp-lookup.js supplies (hashId of the row's id, the same value
 *     // RsvpResponse keys on) — never a guest id, which this endpoint has
 *     // never accepted from a client and still does not. See memberWrites.
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
import { resolveGuestByToken, resolveHousehold } from './_lib/rsvpAuth.js';
import { leadOf, salutation } from '../src/lib/household.js';
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
// SERVER-SAFE BY CONSTRUCTION: weddingEvents.js imports guestDate.js and
// dressCode.js and nothing else, and none of the three touches React or the
// DOM. Same arrangement api/guest-page.js uses for the sample-content chain.
import { getWeddingEvents, getGuestEventResponse } from '../src/lib/weddingEvents.js';
// THE SAME MODULE THE GUEST'S SCREEN USES, deliberately. A form that only
// looks closed is not closed (goal ruling, item 2), and a refusal worded
// differently from the screen that caused it reads like a bug to the guest.
// One module decides open or closed and one function writes the sentence, so
// the endpoint and the page cannot drift apart.
import { deadlineHasPassed, closedBody } from '../src/lib/rsvpDeadline.js';

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

/**
 * ── A REPLY IS ONLY KEPT FOR AN EVENT THE GUEST IS INVITED TO ──────────────
 *
 * sanitizeEventResponses above decides whether a submitted row is WELL FORMED.
 * It has never decided whether the row is ALLOWED, and those are different
 * questions: every event_id that arrived with a valid shape was written,
 * whether or not this guest was invited to that event and whether or not the
 * event still exists. The token proves who is replying; it says nothing about
 * what they may reply to.
 *
 * That matters more now that the guest site shows a guest only their own
 * events, because the form can no longer be the check. A stale tab, a shared
 * link, a hand-made POST or a client bug could each file a row under an event
 * the couple never invited this guest to, and the dashboard would then count
 * them as replying to it. Nothing would look wrong: a yes is a yes, whatever
 * event it is filed under.
 *
 * DROPPED, NOT REJECTED, for the reason the sanitizer already gives about
 * malformed rows: a guest who answered three events correctly and one they
 * should never have been offered has still answered three, and refusing the
 * whole submission would lose all four. The count goes back in the response so
 * a client can tell "saved" from "saved most of it", and it is logged so a
 * pattern of them is visible.
 *
 * A PLUS-ONE INHERITS THE HOST'S SET. `guest` is the host record for both
 * roles and `role` only says who is speaking, so there is one invited set per
 * guest row and a plus-one cannot reach past it.
 *
 * EXPORTED so a guard can drive the decision without a network call, exactly
 * as confirmationRecipient above is and for the same reason: the decision is a
 * function of two plain values, and this endpoint has no `deps` seam.
 */
export function keepOnlyInvitedEvents(eventResponses = [], { wedding, guest } = {}) {
  const invitedEventIds = new Set(
    getWeddingEvents(wedding)
      .filter((ev) => getGuestEventResponse(guest, ev).invited)
      .map((ev) => ev.event_id));
  const kept = [];
  const droppedEventIds = [];
  for (const r of eventResponses) {
    if (invitedEventIds.has(r.event_id)) kept.push(r);
    else droppedEventIds.push(r.event_id);
  }
  return { kept, droppedEventIds };
}

/**
 * ── A LEAD REPLYING FOR THE REST OF THEIR HOUSEHOLD ────────────────────────
 *
 * Item 5 of goals/2026-10-07-households-and-children.md, under that goal's
 * named exception for this file. Three gates, each of which is the whole
 * answer to a different question:
 *
 *   1. IS THIS A LEAD'S LINK AT ALL. The household is read server-side from
 *      the holder's own row (api/_lib/rsvpAuth.js's resolveHousehold, scoped
 *      to their household_id and their owner), and if the holder is not its
 *      lead, every member answer is rejected. That is the goal's rule that "a
 *      member who has their own link still answers for themselves alone",
 *      enforced where it cannot be bypassed rather than in the form.
 *
 *   2. IS THIS REF SOMEBODY ON THAT INVITATION. A ref is matched against the
 *      rows read here, never trusted. So a forged ref resolves to nobody, a
 *      stale one from a household that has since changed resolves to nobody,
 *      and a ref belonging to another wedding's guest cannot appear in the set
 *      at all. The holder's own ref is rejected too: their answers travel in
 *      event_responses, and accepting both would write the same reply twice.
 *
 *   3. WAS THIS MEMBER INVITED TO THIS EVENT. keepOnlyInvitedEvents, above,
 *      applied PER MEMBER rather than per guest — #891's rule, which the form
 *      cannot be the check for now that one person answers for several.
 *
 * AND PLUS-ONES ARE STRIPPED HERE AS WELL AS IN THE FORM. A plus-one belongs
 * to the lead; a member's write carries plus_ones: 0 whatever arrived.
 *
 * REJECTED, NOT REFUSED, for the reason the sanitizer already gives: a lead
 * who answered for three people and sent one ref that no longer resolves has
 * still answered for two. The counts go back in the response and are logged.
 *
 * EXPORTED so a guard can drive the decision without a network call, as
 * confirmationRecipient and keepOnlyInvitedEvents are, and `refOf` is
 * injectable for the same reason: hashId needs the admin key.
 */
export function memberWrites({ submitted = [], household = [], holder, wedding, refOf = hashId } = {}) {
  const rejected = [];
  const list = Array.isArray(submitted) ? submitted.filter(Boolean) : [];
  if (list.length === 0) return { writes: [], rejected };
  const rows = (Array.isArray(household) ? household : []).filter(Boolean);
  const isHolder = (g) => g === holder || (!!g?.id && g.id === holder?.id);
  const lead = leadOf(rows);
  if (rows.length < 2 || !lead || !isHolder(lead)) {
    for (const m of list) rejected.push({ ref: typeof m?.ref === 'string' ? m.ref : '', reason: 'not_the_lead' });
    return { writes: [], rejected };
  }
  const byRef = new Map(rows.map((g) => [refOf(g.id), g]));
  const writes = [];
  const seen = new Set();
  for (const m of list) {
    const ref = typeof m?.ref === 'string' ? m.ref : '';
    const row = ref ? byRef.get(ref) : null;
    if (!row) { rejected.push({ ref, reason: 'unknown_member' }); continue; }
    if (isHolder(row)) { rejected.push({ ref, reason: 'holder_answers_in_event_responses' }); continue; }
    if (seen.has(ref)) { rejected.push({ ref, reason: 'duplicate_ref' }); continue; }
    seen.add(ref);
    const { kept } = keepOnlyInvitedEvents(sanitizeEventResponses(m?.event_responses), { wedding, guest: row });
    const stripped = kept.map((r) => ({ ...r, plus_ones: 0, plus_one_names: [] }));
    if (stripped.length === 0) { rejected.push({ ref, reason: 'nothing_allowed' }); continue; }
    writes.push({ ref, guest: row, eventResponses: stripped });
  }
  return { writes, rejected };
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

    // ── REPLIES HAVE CLOSED: REFUSED BEFORE ANYTHING IS WRITTEN ───────────
    //
    // The named exception in goals/2026-10-09-reply-lifecycle.md item 2. This
    // is a backstop, not a path the product offers: the form stops showing the
    // two buttons at the same moment, from the same function, so a guest who
    // reaches this branch sent a request nothing in the product offered them.
    //
    // 409, NOT 400. Nothing about the submission is malformed. The state of
    // the wedding is what refuses it, and the sentence returned is the same
    // one the screen shows, including its promise that a note still reaches
    // the couple. That promise holds: the note form posts to
    // api/guest-note-submit.js, a different endpoint, which stays open.
    //
    // BEFORE THE FIRST WRITE and before keepOnlyInvitedEvents, so a refused
    // submission leaves no RsvpResponse row and no partial state behind.
    //
    // Clearing or moving the date reopens this with nothing else to do: the
    // decision is derived per request and nothing is cached anywhere.
    if (deadlineHasPassed(wedding?.rsvpContent?.rsvpDeadline)) {
      return res.status(409).json({
        error: closedBody(coupleDisplayName(wedding), wedding?.rsvpContent?.rsvpDeadline),
        repliesClosed: true,
      });
    }

    const isPlusOne = role === 'plus_one';
    const guestIdHash = hashId(guest.id);

    // The decision is keepOnlyInvitedEvents, above, with its reasoning.
    const submittedCount = eventResponses.length;
    const { kept: invitedResponses, droppedEventIds } = keepOnlyInvitedEvents(eventResponses, { wedding, guest });
    if (droppedEventIds.length > 0) {
      console.warn(`[rsvp-submit] dropped ${droppedEventIds.length} of ${submittedCount} event row(s) for an uninvited or unknown event: ${droppedEventIds.join(', ')}`);
    }

    // One row per submitted event (append-only — an event this submission
    // didn't touch simply gets no new row, and its previous latest row still
    // stands under latest-wins aggregation). Plus exactly one guest-level
    // row (event_id: null) for the whole-submission text fields, written
    // unconditionally (even if empty) so a guest clearing a previous song
    // request/note/dietary entry is itself the new latest value.
    await Promise.all([
      ...invitedResponses.map(r => createRsvpResponse({
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

    // ── AND THE REST OF THE HOUSEHOLD, IF THIS IS A LEAD'S LINK ───────────
    //
    // After the holder's own rows, and in its own await: a member write that
    // failed must not take the holder's reply down with it, which is the same
    // reasoning the notification and the receipt below are ordered by.
    //
    // A PLUS-ONE NEVER WRITES FOR A HOUSEHOLD. Their token speaks for a
    // different person on the same row; they are not the lead of anything.
    let householdRows = [];
    let memberResult = { writes: [], rejected: [] };
    const submittedMembers = !isPlusOne && Array.isArray(req.body?.members)
      ? req.body.members.slice(0, 12) : [];
    if (submittedMembers.length > 0) {
      householdRows = await resolveHousehold(guest).catch((err) => {
        console.error('[rsvp-submit] household read failed:', err.message);
        return [];
      });
      memberResult = memberWrites({ submitted: submittedMembers, household: householdRows, holder: guest, wedding });
      if (memberResult.rejected.length > 0) {
        console.warn(`[rsvp-submit] rejected ${memberResult.rejected.length} member answer(s): ${memberResult.rejected.map((r) => r.reason).join(', ')}`);
      }
      await Promise.all(memberResult.writes.flatMap((w) => w.eventResponses.map((r) => createRsvpResponse({
        wedding_id: wedding.id,
        guest_id_hash: w.ref,
        is_plus_one: false,
        event_id: r.event_id,
        status: r.status,
        meal_choice: r.meal_choice,
        plus_ones: r.plus_ones,
        plus_one_names: r.plus_one_names,
      }))));
    }

    console.log('[rsvp-submit] RSVP recorded for token', token.slice(0, 8) + '…');

    // Awaited (not fire-and-forget) — a Vercel serverless function can
    // freeze right after the response is sent, so background work isn't
    // guaranteed to finish. notify() already swallows and logs its own
    // errors internally, so this can never turn a successful RSVP into a
    // failed response even if the notification/email step has trouble.
    // EVERYONE THIS REPLY COVERED, holder first. Empty for a single guest, and
    // then every line below is the one that shipped before this.
    const people = memberResult.writes.length > 0
      ? [
        { name: guest.name, attending: invitedResponses.some((r) => r.status === 'yes') },
        ...memberResult.writes.map((w) => ({
          name: w.guest.name,
          attending: w.eventResponses.some((r) => r.status === 'yes'),
        })),
      ]
      : [];

    const attendingCount = invitedResponses.filter(r => r.status === 'yes').length;
    const declinedCount = invitedResponses.filter(r => r.status === 'no').length;
    const responseSummary = attendingCount > 0
      ? `Attending${invitedResponses.length > 1 ? ` (${attendingCount} of ${invitedResponses.length} events)` : ''}`
      : declinedCount > 0 ? 'Declined' : 'Responded';
    await notify({
      recipientUserId: wedding.created_by_id,
      type: 'rsvp_received',
      title: isPlusOne
        ? `${guest.plus_one_name || `${guest.name}'s plus-one`} responded`
        : `New RSVP from ${guest.name}`,
      // ONE INVITATION, SEVERAL REPLIES, said out loud: the couple is reading
      // one notification about an answer for more than one person, and the
      // count is the difference between "Priya replied" and "Priya replied for
      // three people".
      body: people.length > 1
        ? `${responseSummary} · replied for ${people.length} people on one invitation`
        : responseSummary,
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
        const attending = invitedResponses.some(r => r.status === 'yes');
        const firstEvent = invitedResponses[0] || null;
        const { subject, html, text } = renderRsvpConfirmationEmail({
          universeId: wedding.activeUniverse,
          coupleNames: coupleName,
          // THE RECEIPT IS ADDRESSED THE WAY THE INVITATION WAS. A household
          // reply is the lead's, and salutation() is the same first-names rule
          // the card used, so "Hi Priya and Dev," matches what arrived.
          guestName: isPlusOne ? (guest.plus_one_name || guest.name)
            : (people.length > 1 ? (salutation(householdRows) || guest.name) : guest.name),
          attending,
          // Named, because the others never see this email: one person answered
          // for them and this is the only record they get a chance to correct.
          people,
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

    // `dropped` is always present, so a client reads a number rather than
    // inferring one from a missing key.
    return res.status(200).json({
      ok: true,
      confirmation,
      dropped: droppedEventIds.length,
      // Always present, like `dropped`, so a client reads numbers rather than
      // inferring them from missing keys.
      members_written: memberResult.writes.length,
      members_rejected: memberResult.rejected.length,
    });
  } catch (err) {
    console.error('[rsvp-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
