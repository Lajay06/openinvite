/**
 * An invitation opens the entrance, and cannot be sent to an unpublished site.
 *
 * TWO FAULTS, both guest-facing, both spending the one arrival each guest gets.
 *
 * LANDING. Every guest-facing email carries one button. Its destination came
 * from buildGuestCtaUrl, gated on `showDate` — a LAYOUT flag about whether the
 * email prints the wedding date. Invitations and save-the-dates happen to set
 * it, so they opened the couple's site; reminders, updates and both thank-yous
 * do not, so they dropped the guest on the bare RSVP form, past the entrance,
 * the names and the whole invitation. The gate is gone: a site and a token are
 * the only conditions, so every type lands on the entrance.
 *
 * The token still rides as `?rsvp=<token>`, which MultiPageWeddingWebsite
 * consumes in a useState initialiser and strips from the address bar before
 * any fetch — so the #825–#827 flow is untouched and the greeting still fires.
 * That plumbing has its own guards (guest-first-name-plumbing,
 * guest-greeting-entrance); this one only asserts the link still carries the
 * token in the shape those guards expect.
 *
 * SENDING. Nothing stopped a couple sending while the site was unpublished,
 * and api/wedding-by-slug.js refuses an unpublished site, so every link in
 * that batch answered "this invitation does not work".
 *
 * WHAT EACH LAYER IS WORTH, stated because it matters: the client refusal is
 * what a couple meets, and the server refusal backs it up against a stale or
 * mis-wired client. The server reads `websiteEnabled` from the request body,
 * so it is NOT proof against a crafted request — re-reading the flag from
 * Base44 would mean a new call carrying the admin key, which this change was
 * not permitted to add. The caller is already authenticated as the owner of
 * the guests being mailed, so the worst a crafted request buys is a broken
 * link to the sender's own site.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { buildGuestCtaUrl } from '../../src/lib/emailTemplate.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

const SITE = 'https://openinvite.com.au/w/ada-and-alan';
const TOKEN = 'guard-token-not-a-real-token';
const RSVP = 'https://openinvite.com.au/rsvp/' + TOKEN;

/** Every type the product sends. The four that used to fall through are named. */
const TYPES = ['invite', 'save_the_date', 'reminder', 'update', 'thank_you_attending', 'thank_you_declined'];
const SHOW_DATE = new Set(['invite', 'save_the_date']);

export async function runInviteEntranceAndPublishGate() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  An invitation opens the entrance, and an unpublished site is not sendable:\n');

  // ── Landing ───────────────────────────────────────────────────────────────
  for (const type of TYPES) {
    // showDate is passed by the caller for layout; the CTA must ignore it.
    const url = buildGuestCtaUrl({ showDate: SHOW_DATE.has(type), siteUrl: SITE, rsvpToken: TOKEN, rsvpUrl: RSVP });
    const onSite = url.startsWith(SITE) && !url.includes('/rsvp/');
    check(`${type.padEnd(20)} lands on the site, not /rsvp/`, onSite, url.replace(TOKEN, '<token>'));
  }
  const withToken = buildGuestCtaUrl({ siteUrl: SITE, rsvpToken: TOKEN, rsvpUrl: RSVP });
  check('  the token still rides as ?rsvp=, which the entrance consumes and strips',
    withToken === `${SITE}?rsvp=${encodeURIComponent(TOKEN)}`, withToken.replace(TOKEN, '<token>'));
  check('  a guest with no token still gets a working link',
    buildGuestCtaUrl({ siteUrl: SITE, rsvpToken: '', rsvpUrl: RSVP }) === RSVP, 'falls back to the RSVP page');
  check('  and no site at all still gets one',
    buildGuestCtaUrl({ siteUrl: '', rsvpToken: TOKEN, rsvpUrl: RSVP }) === RSVP, 'falls back to the RSVP page');

  // ── Sending ───────────────────────────────────────────────────────────────
  const api = read('api/send-invites.js');
  check('the server refuses when websiteEnabled is not true',
    /if \(wedding\.websiteEnabled !== true\) \{/.test(api) && /status\(409\)/.test(api) && /website_unpublished/.test(api),
    '409 website_unpublished');
  check('  and refuses before any email is rendered or sent',
    api.indexOf('website_unpublished') < api.indexOf('renderInvitationEmail({'), 'refusal precedes the render call');

  const modal = read('src/components/guests/SendInvitesModal.jsx');
  const send = modal.match(/const handleSend = async \(\) => \{[\s\S]*?setSending\(true\);/);
  check('the client refuses in handleSend, before sending starts',
    !!send && /websiteEnabled !== true/.test(send[0]) && /return;/.test(send[0]),
    send ? 'refused before setSending' : 'no handleSend');
  check('  it refuses an unclaimed address too', !!send && /!wedding\?\.slug/.test(send[0]), 'no slug, no send');
  check('  and says where to go', !!send && /Design studio/.test(send[0]), 'routes to Design studio');
  check('  the client sends the slug and the flag the server needs',
    /slug: wedding\?\.slug/.test(modal) && /websiteEnabled: wedding\?\.websiteEnabled/.test(modal), 'both in the payload');

  // ── The site URL is derived, not taken on trust ───────────────────────────
  check('the server derives the site URL from the slug and a known origin',
    /const slug = sanitizeString\(wedding\.slug\)/.test(api) && /resolveBaseUrl\(req\.headers\.origin\)/.test(api),
    'slug + resolveBaseUrl');
  check('  and resolveBaseUrl refuses an unknown origin',
    /KNOWN_ORIGINS\.has\(originHeader\)/.test(api) && /return 'https:\/\/openinvite\.com\.au';/.test(api),
    'falls back to the canonical origin');

  // ── The limits this change was given ──────────────────────────────────────
  check('no line that reads or passes the admin key was touched',
    /const BASE44_ADMIN_KEY = process\.env\.BASE44_ADMIN_KEY;/.test(api)
      && /adminKey = BASE44_ADMIN_KEY,/.test(api)
      && /await fetchOwned\(caller\.id, adminKey\)/.test(api),
    'all three still read as they did');

  return results;
}
