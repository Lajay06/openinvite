/**
 * POST /api/send-invites
 *
 * Sends wedding invitations, reminders, updates, or thank-you notes in batch
 * using Resend's batch API. Email HTML/text comes from the single shared
 * template (src/lib/emailTemplate.js's renderInvitationEmail) — the exact
 * same function the SendInvitesModal preview pane calls client-side. This
 * file does not build HTML itself; it only resolves per-guest data and
 * hands it to renderInvitationEmail.
 *
 * Body:
 *   {
 *     type?: 'invite' | 'reminder' | 'update' | 'thank_you_attending' | 'thank_you_declined',
 *       // defaults to 'invite'
 *     universeId?: string,      // one of UNIVERSE_EMAIL_STYLES' keys, falls back to 'london'
 *     isTest?: boolean,         // "send test to me" — prefixes the subject, skipped from guest-count logging
 *     guests: [{ email: string, name: string, rsvpUrl: string, rsvpToken?: string,
 *               events?: Array<{name,date,startTime,venue}> }],
 *       // events — the events THIS guest is invited to; per-guest since invite
 *       // lists differ per event. Falls back to wedding.venue/weddingDate as a
 *       // single synthetic event if omitted (back-compat with older callers).
 *     wedding: { coupleName: string, weddingDate: string, venue: string, coverPhoto?: string, venuePhotoUrl?: string },
 *     bannerChoice?: 'wedding' | 'venue' | 'none',  // resolved server-side via getBannerImageUrl; defaults to 'none'
 *     customSubject?: string,   // merge tags: [Guest name], [Wedding date], [Couple names]
 *     customBody?: string,      // merge tags: [Guest name], [Wedding date], [Couple names], [RSVP link]
 *   }
 */

import { Resend } from 'resend';
import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
  sanitizeString,
} from './_lib/security.js';
import { renderInvitationEmail, getEmailTypeConfig, getBannerImageUrl } from '../src/lib/emailTemplate.js';
import { guestStopEmailsUrl } from './_lib/guestStopToken.js';
import { adminList } from './_lib/base44Entities.js';
import { invitationGreetingName } from '../src/lib/guestGreeting.js';
import { verifyBase44User, fetchOwnedGuestEmails, filterGuestsByOwnership } from './_lib/auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_ADDRESS = 'hello@openinvite.com.au';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

function replaceMergeTags(str, guestName, coupleName, dateStr, rsvpUrl) {
  // ONE NAME OR SEVERAL. `guestName` is a person for a single guest and a
  // household salutation ("Priya and Dev") for an invitation that covers
  // several, so the first word is not always the greeting. This is the line a
  // guest actually reads: the modal always sends a composed body, prefilled
  // with "Hi [Guest name],", so the template's own default message is not the
  // path a real send takes. See src/lib/guestGreeting.js, and SendInvitesModal
  // whose copy of this function must stay in step with it.
  const greetName = guestName ? invitationGreetingName(guestName) : 'Guest';
  return str
    .replace(/\[Guest name\]/gi, greetName)
    .replace(/\[Wedding date\]/gi, dateStr || '')
    // Not '' — see SendInvitesModal's copy of this function. A merge tag the
    // couple typed is a request for a value, and an empty substitution deletes
    // their sentence rather than completing it.
    .replace(/\[Couple names\]/gi, coupleName || 'the couple')
    .replace(/\[RSVP link\]/gi, rsvpUrl || '');
}

/**
 * `deps` follows api/webhooks/stripe.js's own pattern: every seam defaults to
 * the real thing, and a guard can drive this handler end to end with a stubbed
 * Resend rather than asserting the shape of a copy of the code.
 */
/**
 * Known web origins, and the safe base for a guest-facing link.
 *
 * A COPY, deliberately. api/rsvp-link-request.js:82 has the same four lines
 * for the same reason: an Origin header is attacker-controlled, so a link
 * built from it verbatim could point a guest anywhere. This change is not
 * allowed to touch another file under api/, so it carries its own copy rather
 * than reaching into a sibling. If a third caller needs it, that is the moment
 * it earns a home in api/_lib.
 */
const KNOWN_ORIGINS = new Set([
  'https://openinvite.com.au',
  'https://www.openinvite.com.au',
  'https://openinvite-pearl.vercel.app',
]);

function resolveBaseUrl(originHeader) {
  if (originHeader && (KNOWN_ORIGINS.has(originHeader) || originHeader.endsWith('.vercel.app'))) {
    return originHeader;
  }
  return 'https://openinvite.com.au';
}

/**
 * THE CALLER'S OWN GUESTS WHO ASKED NOT TO BE EMAILED, by address.
 *
 * Item 6's server-side skip. Scoped to created_by_id, so it can only ever
 * answer about the caller's own list, and keyed by lowercased address because
 * that is what the send payload carries.
 *
 * THROUGH adminList, not a hand-built URL. api/_lib/base44Entities.js already
 * owns the base, the app id, the paging limit and the unwrapping; a second
 * place that built those would be a second place to get them wrong, and the
 * first version of this function did exactly that and failed lint for two
 * undefined constants.
 *
 * EMPTY ON FAILURE, WHICH SKIPS NOBODY. That is the wrong direction to fail
 * and it is deliberate rather than overlooked: the alternative is refusing
 * every send whenever one query fails, which is a worse product for a rarer
 * fault. It does mean that if this read breaks, the couple's own screen is the
 * only thing between an opted-out guest and an email, so the failure is
 * logged rather than swallowed.
 *
 * It reads the raw rows rather than merging PII: email_opt_out is not an
 * encrypted field, and the plaintext email column is the same one
 * fetchOwnedGuestEmails already matches on for ownership.
 */
export async function fetchOptedOutGuestEmails(userId) {
  try {
    const rows = await adminList('Guest', { created_by_id: userId, email_opt_out: true });
    return new Set((rows || []).map((g) => String(g?.email || '').trim().toLowerCase()).filter(Boolean));
  } catch (err) {
    console.error(`[send-invites] opt-out read failed, skipping nobody: ${err.message}`);
    return new Set();
  }
}

/**
 * Resend's rule for a tag name and a tag value alike: ASCII letters, numbers,
 * underscores and dashes, up to 256 characters.
 */
const TAG_VALUE = /^[A-Za-z0-9_-]{1,256}$/;

/**
 * The tags that let a bounce find its way back to one guest.
 *
 * WHY TAGS AND NOT THE ADDRESS. api/resend-webhook.js matches a bounced email
 * to a guest through these and never by searching for the address: searching
 * would mean reading guest rows by email, and two accounts can hold the same
 * address. The owner id travels beside the guest id so that webhook can scope
 * its read to one account instead of trusting a guest id on its own.
 *
 * AN ARRAY HERE, AN OBJECT THERE. The send API takes tags as a list of name
 * and value pairs; the webhook receives them as a record keyed by name. The
 * two sides genuinely do not share a shape, so neither is written as though
 * it were the other.
 *
 * NULL RATHER THAN A THROW, and the caller sends anyway. A tag exists to help
 * with a bounce that may never happen, and an invitation is the one moment a
 * couple gets with a guest. Refusing to send because an id would not pass a
 * character rule would trade the thing that matters for the thing that might.
 */
export function sendTags(guestId, ownerId) {
  const guest = String(guestId ?? '');
  const owner = String(ownerId ?? '');
  if (!TAG_VALUE.test(guest) || !TAG_VALUE.test(owner)) return null;
  return [{ name: 'guest_id', value: guest }, { name: 'owner_id', value: owner }];
}

/**
 * Every address on this account that bounced permanently.
 *
 * ── WHY THIS READS THE ROWS AND FILTERS IN JAVASCRIPT ──────────────────────
 *
 * email_bounce is an OBJECT, so there is no scalar to put in a query the way
 * email_opt_out: true goes into the one above. A filter on a nested path is
 * not a shape this platform is known to support, and a filter Base44 does not
 * understand is one it may ignore: that returns every row, which would read
 * as "nobody bounced" or "everybody did" depending only on which way the
 * surrounding code happened to lean. So the query carries the one key that is
 * certainly supported and the classification is checked here.
 *
 * ONLY kind === 'permanent' COUNTS, which is also the only kind the webhook
 * writes. Checked rather than assumed, so a row stamped by some later version
 * of that endpoint cannot start skipping sends on a value this function has
 * never seen.
 *
 * EMPTY ON FAILURE, WHICH SKIPS NOBODY, for the same reason and at the same
 * cost as the opt-out read above. It is the wrong direction to fail and it is
 * chosen rather than overlooked: refusing every send whenever one query fails
 * is a worse product for a rarer fault. Logged, not swallowed.
 *
 * THE LIST CALL IS A PARAMETER so a guard can exercise the filter above.
 * Without it the only way to check that nothing but a permanent stamp skips
 * a send is to re-implement the filter in the guard and compare it with
 * itself, which proves nothing at all. Same seam as resolveOwnerCurrency's
 * fetchImpl in api/_lib/guestSafeWedding.js. Production passes nothing.
 */
export async function fetchBouncedGuestEmails(userId, list = adminList) {
  try {
    const rows = await list('Guest', { created_by_id: userId });
    return new Set((rows || [])
      .filter((g) => g?.email_bounce?.kind === 'permanent')
      .map((g) => String(g?.email || '').trim().toLowerCase())
      .filter(Boolean));
  } catch (err) {
    console.error(`[send-invites] bounce read failed, skipping nobody: ${err.message}`);
    return new Set();
  }
}

export default async function handler(req, res, {
  sendBatch = (b) => resend.batch.send(b),
  verifyUser = verifyBase44User,
  fetchOwned = fetchOwnedGuestEmails,
  fetchOptedOut = fetchOptedOutGuestEmails,
  fetchBounced = fetchBouncedGuestEmails,
  adminKey = BASE44_ADMIN_KEY,
} = {}) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'invites', 20, 60_000);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const caller = await verifyUser(req);
  if (!caller) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!adminKey) {
    console.error('[send-invites] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const {
      type = 'invite', guests = [], wedding = {}, customSubject, customBody, universeId, isTest = false,
      bannerChoice = 'none',
    } = req.body || {};

    if (!Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ error: 'guests array is required and must not be empty' });
    }
    if (guests.length > 200) {
      return res.status(400).json({ error: 'Maximum 200 guests per batch' });
    }

    // Only send to guests that actually belong to the authenticated
    // caller's own wedding — never an arbitrary attacker-supplied email,
    // even if the request body claims one. The caller's own verified email
    // is also allowed through, since "send a test copy to me" (isTest)
    // submits the caller's own address as a synthetic guest entry, not a
    // real Guest record.
    const ownedEmails = await fetchOwned(caller.id, adminKey);
    if (caller.email) ownedEmails.add(caller.email.trim().toLowerCase());
    const ownedGuests = filterGuestsByOwnership(guests, ownedEmails);
    if (ownedGuests.length === 0) {
      return res.status(403).json({ error: 'None of the supplied guests belong to your wedding.' });
    }

    // AN UNPUBLISHED SITE IS NOT SENDABLE.
    //
    // Every link in these emails opens the couple's site. While the site is
    // unpublished, api/wedding-by-slug.js:314 refuses it, so each guest who
    // follows one meets a page saying the invitation does not work — and the
    // couple has already spent the one moment they get with that guest.
    //
    // WHAT THIS LAYER IS AND IS NOT. `websiteEnabled` arrives in the request
    // body, so this refuses a mis-wired or stale client, not a crafted
    // request; re-reading the flag from Base44 here would mean a new call
    // carrying the admin key, which this change is not permitted to add. The
    // caller is already authenticated as the owner of these guests, so the
    // worst a crafted request buys is a broken link to the sender's own site.
    // The refusal a couple actually meets is this one plus the client's, in
    // SendInvitesModal.handleSend.
    if (wedding.websiteEnabled !== true) {
      return res.status(409).json({
        error: 'Your website is not published yet, so these links would not work. Publish it from Design studio, then send.',
        reason: 'website_unpublished',
      });
    }

    const coupleName = sanitizeString(wedding.coupleName) || '';
    const weddingDate = sanitizeString(wedding.weddingDate) || '';
    const venue = sanitizeString(wedding.venue) || '';
    // The invitation CTA opens the couple's site. Sanitized like every other
    // caller-supplied string, and empty is fine — the template falls back to
    // the RSVP link rather than rendering a button with no destination.
    // THE SITE URL IS DERIVED HERE, not taken on trust.
    //
    // It used to be whatever the client put in `wedding.siteUrl`, so the
    // destination of every guest-facing button depended on a value the caller
    // supplied. The slug is the couple's own published address and the base is
    // resolved from a known origin, so the button cannot be pointed elsewhere
    // by the request. The client's value stays as a fallback for a caller that
    // has not been updated yet.
    const slug = sanitizeString(wedding.slug) || '';
    const siteUrl = slug
      ? `${resolveBaseUrl(req.headers.origin)}/w/${encodeURIComponent(slug)}`
      : sanitizeString(wedding.siteUrl) || '';

    // Guest-facing from-name is the couple's own names, not "Openinvite" —
    // this email should read as coming from them (email branding audit).
    // The address itself stays on the verified sending domain regardless;
    // only the display name changes. reply-to is the caller's own verified
    // email (they ARE the wedding owner, authenticated above), so a guest's
    // reply reaches the couple directly instead of the support inbox —
    // falls back to the support address only if that's somehow missing.
    const fromName = coupleName || 'Openinvite';
    const FROM = `${fromName} <${SUPPORT_ADDRESS}>`;
    const replyTo = caller.email || SUPPORT_ADDRESS;

    const dateStr = weddingDate
      ? new Date(weddingDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // ── GUESTS WHO ASKED NOT TO BE EMAILED ARE SKIPPED HERE ───────────────
    //
    // Item 6 of goals/2026-10-09-reply-lifecycle.md, the named exception that
    // allows this file to change.
    //
    // READ FROM THE DATABASE, NEVER FROM THE REQUEST. The client filters too,
    // so the couple sees the count before they press send, but a client-side
    // filter is a courtesy and not a rule: a caller that simply omitted the
    // flag, or an older app build that knows nothing about it, would otherwise
    // mail someone who had asked to be left alone. The same reasoning as the
    // deadline in item 2, and the same conclusion: the check that matters is
    // the one the caller cannot edit.
    //
    // ONE EXTRA QUERY, SCOPED TO THE CALLER, with the admin key, because
    // listing Guest by created_by_id needs it. It deliberately does NOT reuse
    // or widen api/_lib/auth.js: that file is outside this item's named set,
    // and a second caller of a widened helper is a second thing to keep in
    // step.
    //
    // A FAILED READ SENDS TO NOBODY NEW. If this query fails the set is empty,
    // which means no guest is skipped: that is the wrong direction to fail, so
    // it is stated rather than hidden. The couple's own client-side filter
    // still applies, and the alternative, refusing every send whenever one
    // query fails, would be a worse product for a rarer fault.
    const optedOutEmails = await fetchOptedOut(caller.id);
    const bouncedEmails = await fetchBounced(caller.id);
    const addressOf = (g) => String(g.email || '').trim().toLowerCase();

    // ── COUNTED INDEPENDENTLY, NOT ONE AFTER THE OTHER ───────────────────
    //
    // A guest can be both opted out and bounced, and the two numbers answer
    // two different questions a couple may ask. Filtering by one set and then
    // counting the other against what survived would report such a guest once
    // and silently choose which reason the couple heard about. Each count is
    // measured against the whole owned set instead, so the pair can add up to
    // more than the number of guests actually skipped. That is the intended
    // reading: these are two conditions, not two halves of a partition.
    const skippedOptedOut = ownedGuests.filter((g) => optedOutEmails.has(addressOf(g))).length;
    const skippedBounced = ownedGuests.filter((g) => bouncedEmails.has(addressOf(g))).length;
    const sendable = ownedGuests.filter(
      (g) => !optedOutEmails.has(addressOf(g)) && !bouncedEmails.has(addressOf(g)),
    );
    if (skippedOptedOut > 0) {
      console.log(`[send-invites] skipped ${skippedOptedOut} guest(s) who asked not to be emailed`);
    }
    if (skippedBounced > 0) {
      console.log(`[send-invites] skipped ${skippedBounced} guest(s) whose address bounced`);
    }

    const validGuests = sendable.filter(g => g.email && isValidEmail(g.email) && g.rsvpUrl);

    if (validGuests.length === 0) {
      // SAID PRECISELY, because "no valid addresses" would be wrong and
      // confusing when the real reason is that everyone selected had opted out.
      const allOptedOut = ownedGuests.every((g) => optedOutEmails.has(addressOf(g)));
      const allBounced = ownedGuests.every((g) => bouncedEmails.has(addressOf(g)));
      return res.status(400).json({
        // OPT-OUT FIRST, so a guest who is both keeps the sentence this
        // endpoint already gave them. A mixed batch, some opted out and some
        // bounced with nothing left to send, falls through to the general
        // line: neither of the two precise sentences would be true of it, and
        // this goal's copy is used verbatim rather than invented.
        error: allOptedOut
          ? 'Every guest you selected has asked not to be emailed.'
          : allBounced
            ? 'Every guest you selected has a bounced email address. Fix the addresses and try again.'
            : 'No guests with valid email addresses and RSVP links',
        skippedOptedOut,
        skippedBounced,
      });
    }

    const typeConfig = getEmailTypeConfig(type);
    const defaultSubject = `${typeConfig.kicker}: ${coupleName || 'a wedding'}`;
    const bannerImageUrl = getBannerImageUrl(
      { coverPhoto: wedding.coverPhoto, venuePhotoUrl: wedding.venuePhotoUrl },
      bannerChoice,
    );

    let droppedTags = 0;
    const batch = validGuests.map(g => {
      const guestName = sanitizeString(g.name) || '';
      const rsvpUrl = g.rsvpUrl;
      // THE TOKEN TRAVELS AS A TOKEN (owner ruling, Run 6 U1). The caller sends
      // it alongside the URL rather than this file slicing it back out of the
      // URL's tail: a parser is a second place that must agree about the link's
      // shape, and it would silently produce a wrong "token" the day the shape
      // changes. Sanitized like every other caller-supplied string, and never
      // logged — the send log below counts recipients and prints no link.
      const rsvpToken = sanitizeString(g.rsvpToken) || '';

      const subject = (customSubject
        ? replaceMergeTags(sanitizeString(customSubject), guestName, coupleName, dateStr, rsvpUrl)
        : defaultSubject) + (isTest ? ' [Test]' : '');

      const processedBody = customBody
        ? replaceMergeTags(sanitizeString(customBody), guestName, coupleName, dateStr, rsvpUrl)
        : null;

      // Per-guest events (which events THIS guest is invited to). Falls back
      // to a single synthetic event from wedding.venue/weddingDate for older
      // callers that don't send a per-guest events array.
      const events = Array.isArray(g.events) && g.events.length > 0
        ? g.events
        : (venue || weddingDate) ? [{ name: 'Wedding day', date: weddingDate, venue }] : [];

      // THE FOOTER'S STOP LINK, SIGNED HERE because this is where the secret
      // is. The template runs in the browser too (the preview pane calls it),
      // so it takes the URL rather than building one. A guest row with no id
      // gets no link rather than a broken one: signing refuses an empty id.
      const stopEmailsUrl = g.id ? guestStopEmailsUrl(String(g.id)) : '';

      const { html, text } = renderInvitationEmail({
        universeId, type, guestName, coupleNames: coupleName, events, personalMessage: processedBody, rsvpUrl, rsvpToken, siteUrl, weddingDate, bannerImageUrl,
        stopEmailsUrl,
      });

      // THE TAGS, AT THE ONE SITE THAT BUILDS A MESSAGE. A bounce can only be
      // matched back to a guest if the email carried these, so they go on here
      // and nowhere else. A pair that would not pass Resend's character rule
      // is dropped and the send still happens; the count is reported in one
      // line below rather than once per email.
      const tags = sendTags(g.id, caller.id);
      if (!tags) droppedTags += 1;

      return { from: FROM, to: g.email, replyTo, subject, html, text, ...(tags ? { tags } : {}) };
    });

    if (droppedTags > 0) {
      console.log(`[send-invites] sent ${droppedTags} email(s) without tags: a guest id or the owner id is not a valid Resend tag value`);
    }

    const result = await sendBatch(batch);

    // ── THE ERROR FIRST, BECAUSE IT MEANS NOTHING WENT OUT ────────────────
    //
    // Resend reports a refused batch in `error` rather than by throwing, so a
    // handler that only inspects `data` answers 200 on a send that never
    // happened. 502 is the honest status — the failure is upstream of us — and
    // the body says `accepted: false` so the caller never has to infer from an
    // absent field whether any guest was written to.
    if (result?.error) {
      console.error('[send-invites] the provider refused the batch:', result.error.message || result.error);
      return res.status(502).json({
        error: result.error.message || 'The email provider refused the batch',
        accepted: false,
        sent: 0,
      });
    }

    // ── AND NOTHING AFTER THE SEND MAY THROW ──────────────────────────────
    //
    // `result?.data?.map(d => d.id)` lived here, and resend@6 returns
    // `{ data: { data: [{id}] }, error }` — `data` is an object wrapping the
    // array, so `.map` is not a function. The TypeError reached the catch and
    // the endpoint answered 500.
    //
    // The emails were already sent: resend.batch.send is the line above. So
    // guests received their invitations while the couple was told the send
    // failed, and SendInvitesModal's `if (!res.ok) throw` aborted before
    // invite_sent_at was written — leaving the dashboard showing them as
    // unsent, and every retry posting another copy to the same guests.
    //
    // BOTH SHAPES ARE ACCEPTED. The flat form is what the old line expected
    // and what earlier SDK majors returned; tolerating it costs one branch and
    // means an SDK bump cannot resurrect this. Neither can throw: no ids is a
    // log line, not an exception, because the send has already happened and a
    // cosmetic failure must never change what the couple is told.
    const payload = result?.data;
    const ids = Array.isArray(payload?.data) ? payload.data.map((d) => d?.id)
      : Array.isArray(payload) ? payload.map((d) => d?.id)
        : null;
    console.log(`[send-invites] Sent ${batch.length} ${type}${isTest ? ' (test)' : ''} | ids:`,
      ids && ids.length ? ids : 'no ids returned');

    return res.status(200).json({
      sent: batch.length,
      skipped: guests.length - validGuests.length, // includes both non-owned and invalid entries
      // REPORTED SEPARATELY, because the couple needs to know this one. The
      // aggregate above cannot be read as "who asked to be left alone": it
      // also counts guests with no address and guests who are not theirs.
      skippedOptedOut,
      // AND BOUNCED SEPARATELY TOO, for the Guests page to show as its own
      // line. A bounced address is a different thing to tell a couple than a
      // guest who asked to be left alone: one of the two they can fix.
      skippedBounced,
    });
  } catch (err) {
    console.error('[send-invites] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
