/**
 * api/_lib/rsvpAuth.js
 *
 * Shared token-scoped Guest/WeddingDetails resolution for every RSVP
 * endpoint (rsvp-lookup, rsvp-submit, rsvp-poll-vote). Mirrors exactly the
 * client-side logic RSVPPage.jsx used to run in the browser: resolve the
 * guest by rsvp_link_id, then resolve their wedding by the SAME owner
 * (created_by_id) as the matched guest — never the app-wide most-recently-
 * created WeddingDetails record.
 *
 * A guest is only ever resolved by their own token — there is no
 * client-suppliable guest id anywhere in this module's public surface, so
 * a caller can never act on a different guest than the one their token
 * belongs to.
 *
 * feat/plus-one-identity: a token may belong to either the primary guest
 * (Guest.rsvp_link_id) or their plus-one (Guest.plus_one_rsvp_link_id) —
 * both resolve to the SAME underlying Guest record (there's no separate
 * Guest row for a plus-one), so `role` is what callers must branch on to
 * know whose perspective to render/record.
 */

import { hashToken } from './rsvpTokenCrypto.js';
import { mergeGuestPii } from './guestPii.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

async function base44Fetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${BASE44_ADMIN_KEY}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/**
 * Resolves a Guest by their rsvp_link_id token (or their plus-one's own
 * plus_one_rsvp_link_id token), and their wedding by the same owner —
 * exactly mirroring RSVPPage.jsx's prior client-side logic.
 *
 * @param {string} token
 * @returns {Promise<{ guest: object, wedding: object|null, role: 'primary'|'plus_one' } | null>}
 *   null if no guest matches the token under either field.
 */
export async function resolveGuestByToken(token) {
  // Track E: the token a guest presents is unchanged — only how it is STORED
  // changed — so a link emailed months ago still resolves. Two lookups:
  // primary hash, then plus-one hash.
  // Nothing here inspects the token's SHAPE: one live token is a 27-character
  // legacy value rather than a uuid, and a shape check would strand it.
  const byField = async (field, value) => {
    if (!value) return [];
    const q = encodeURIComponent(JSON.stringify({ [field]: value }));
    return unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${q}`));
  };

  const tokenHash = hashToken(token);
  let role = 'primary';
  let guests = await byField('rsvp_link_id_hash', tokenHash);

  if (guests.length === 0) {
    guests = await byField('plus_one_rsvp_link_id_hash', tokenHash);
    if (guests.length > 0) role = 'plus_one';
  }
  // The plaintext fallback is GONE as of E3: the columns are null, so those
  // two lookups could only ever match nothing. Removing them is a deletion
  // rather than a reordering precisely because E2 put the hash first.
  //
  // Deleting this while any row was unmigrated would have permanently orphaned
  // that guest's link, so it was gated on the migration reaching 202/202 —
  // which it did, verified by independent re-read, before this line was cut.

  if (guests.length === 0) return null;

  // THE READ BOUNDARY. A guest row's name/email/phone/dietary_restrictions live
  // encrypted in a blob; the plaintext columns hold NAME_PLACEHOLDER ('—') and
  // nulls. Only mergeGuestPii restores them.
  //
  // Three endpoints downstream of here read PII and did not call it —
  // rsvp-lookup (name, email, dietary_restrictions), rsvp-submit (name, which
  // is where "New RSVP from —" was built) and questionnaire-answer-submit
  // (name, a notification nobody had reported). Restoring HERE fixes all seven
  // callers at once; a fix at each site would have left the others silently
  // wrong, and the next caller written would start wrong too.
  //
  // This is the write-boundary rule applied to a read boundary: resolve the
  // row once, at the single place every caller must pass through.
  //
  // mergeGuestPii is idempotent — it re-reads the blob and copies the same
  // values — so the two callers that already restore (wedding-attendees,
  // my-guest-links) are unaffected.
  //
  // Consequence worth stating plainly: this never worked in production. Every
  // recognised guest on every wedding has been greeted as "Hi —,". It is not
  // a regression from the RSVP embed; the embed put it somewhere the owner
  // finally looked.
  const guest = mergeGuestPii(guests[0]);

  const weddingQuery = encodeURIComponent(JSON.stringify({ created_by_id: guest.created_by_id }));
  const weddings = unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${weddingQuery}`));
  const realWeddings = weddings.filter(w => !w.is_test);
  const wedding = realWeddings.length > 0
    ? realWeddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
    : null;

  return { guest, wedding, role };
}

/**
 * ── EVERYONE ON ONE INVITATION, READ BY THE TOKEN HOLDER'S OWN HOUSEHOLD ───
 *
 * Item 5 of goals/2026-10-07-households-and-children.md, under that goal's
 * named exception for a household-scoped guest read.
 *
 * WHAT THIS WIDENS, STATED PLAINLY. Until now a token resolved to exactly one
 * Guest row, and that was the whole of what a link could read. This reads the
 * rows that SHARE the holder's household_id, so a lead's link can see the
 * names of the people on their own invitation. That is the feature: one card
 * said "Priya and Dev", so Priya's link has to be able to answer for Dev.
 *
 * WHAT IT DOES NOT WIDEN. Two scopes, both required:
 *
 *   household_id  — the holder's own, trimmed; a guest with none reads nothing
 *                   but themselves, which is every guest who existed before
 *                   this shipped.
 *   created_by_id — the holder's own owner. household_id is a free string, and
 *                   a value that collided across two weddings would otherwise
 *                   join two couples' guests into one invitation.
 *
 * An empty or whitespace-only household_id is NOT a household (household.js's
 * rule, and the reason it is normalized there): without this, every row with a
 * blank cell would group into one enormous invitation, and a single link would
 * read all of them.
 *
 * CALLERS ASK FOR THIS, it is not folded into resolveGuestByToken. Three
 * endpoints resolve tokens and only two need a household; adding a Base44 call
 * to every poll vote would be a cost paid for nothing.
 *
 * PII IS RESTORED HERE, through the same mergeGuestPii boundary the single
 * resolve uses. A member's name lives encrypted, so without it a household
 * form would list "—" twice and the confirmation email would too.
 *
 * @param {object} guest  the holder, as resolveGuestByToken returned them
 * @returns {Promise<Array>} the household's rows including the holder's own,
 *   or [] when this guest is their own invitation. Unsorted: the lead rule
 *   lives in src/lib/household.js and the callers apply it.
 */
export async function resolveHousehold(guest) {
  const raw = typeof guest?.household_id === 'string' ? guest.household_id.trim() : '';
  if (!raw || !guest?.created_by_id) return [];
  const q = encodeURIComponent(JSON.stringify({
    household_id: guest.household_id,
    created_by_id: guest.created_by_id,
  }));
  const rows = unwrapList(await base44Fetch('GET', `/apps/${BASE44_APP_ID}/entities/Guest?q=${q}`));
  // THE QUERY IS NOT THE CHECK. A filter the server side of Base44 mis-applies
  // would hand back rows from another household; the same two scopes are
  // re-asserted here against the rows themselves, so a wrong row cannot reach
  // a guest's browser even then.
  return rows
    .filter((g) => g && String(g.household_id || '').trim() === raw && g.created_by_id === guest.created_by_id)
    .map((g) => mergeGuestPii(g));
}
