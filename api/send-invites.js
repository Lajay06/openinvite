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
import { verifyBase44User, fetchOwnedGuestEmails, filterGuestsByOwnership } from './_lib/auth.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_ADDRESS = 'hello@openinvite.com.au';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

function replaceMergeTags(str, guestName, coupleName, dateStr, rsvpUrl) {
  const firstName = guestName ? guestName.split(' ')[0] : 'Guest';
  return str
    .replace(/\[Guest name\]/gi, firstName)
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

export default async function handler(req, res, {
  sendBatch = (b) => resend.batch.send(b),
  verifyUser = verifyBase44User,
  fetchOwned = fetchOwnedGuestEmails,
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

    const validGuests = ownedGuests.filter(g => g.email && isValidEmail(g.email) && g.rsvpUrl);

    if (validGuests.length === 0) {
      return res.status(400).json({ error: 'No guests with valid email addresses and RSVP links' });
    }

    const typeConfig = getEmailTypeConfig(type);
    const defaultSubject = `${typeConfig.kicker}: ${coupleName || 'a wedding'}`;
    const bannerImageUrl = getBannerImageUrl(
      { coverPhoto: wedding.coverPhoto, venuePhotoUrl: wedding.venuePhotoUrl },
      bannerChoice,
    );

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

      const { html, text } = renderInvitationEmail({
        universeId, type, guestName, coupleNames: coupleName, events, personalMessage: processedBody, rsvpUrl, rsvpToken, siteUrl, weddingDate, bannerImageUrl,
      });

      return { from: FROM, to: g.email, replyTo, subject, html, text };
    });

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
    });
  } catch (err) {
    console.error('[send-invites] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
