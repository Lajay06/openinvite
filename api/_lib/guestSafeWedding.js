/**
 * api/_lib/guestSafeWedding.js
 *
 * Explicit allowlist of WeddingDetails fields the published, anonymous
 * guest site is confirmed to read (verified by grepping every live guest-
 * facing page — src/components/guest-website/**, src/pages/GuestAccommodation.jsx,
 * GuestTransport.jsx, GuestMusic.jsx, ExperienceGuide.jsx — for
 * weddingDetails.<field> / masterData.<field> access).
 *
 * Never include: websitePassword, emergencyContacts, dayVendorContacts, or
 * anything billing-adjacent (UserPayment is a separate entity, never
 * touched here). websitePassword specifically is replaced by a computed
 * passwordProtected boolean — the plaintext password itself must never
 * reach the browser; verifyPassword() below compares it server-side.
 *
 * Exported as pure, framework-agnostic functions (no JSX, no `base44`
 * import) so both api/wedding-by-slug.js and the plain-Node test harness
 * (tests/persistence/*.mjs) can import this file directly.
 */

import { verifyWebsitePassword } from './websitePasswordHash.js';

export const GUEST_SAFE_WEDDING_FIELDS = [
  'id',
  'slug',
  'couple1Name',
  'couple2Name',
  'coupleNames',
  'weddingDate',
  'coverPhoto',
  'heroVideoUrl',
  'welcomeMessage',
  'mainCeremony',
  'reception',
  'preWeddingEvents',
  'postWeddingEvents',
  'pageSections',
  'enabledPages',
  'activeTheme',
  'activeTypography',
  'activeUniverse',
  'pageTransition',
  'scrollAnimation',
  'weddingPolicies',
  'polls',
  'qna',
  'musicContent',
  'accommodation',
  'guestSuiteAccommodation',
  'transport',
  'guestSuiteTransport',
  'experienceGuide',
  'registryContent',
  'homeContent',
  'ourStoryContent',
  'celebrationContent',
  'rsvpContent',
  'travelContent',
  'photosContent',
  'weddingStyle',
  'venueType',
  'mealOptions',
  // Round 7 ask #15 — background-music settings for the invite/website
  // player. The showAttending/showCircle flags here are just feature
  // toggles, not guest data — the actual attendee names they gate are
  // never read off WeddingDetails at all; they come from the separate,
  // per-guest-token-scoped api/wedding-attendees.js, which re-checks
  // these same two flags server-side before returning anything.
  'guestExperienceSettings',
];

/**
 * Explicit fields that must NEVER be returned to an anonymous caller,
 * regardless of what gets added to GUEST_SAFE_WEDDING_FIELDS in the future.
 * Checked defensively in pickGuestSafeFields even though the allowlist
 * above is already exhaustive — a second layer, not the primary control.
 */
export const NEVER_RETURN_FIELDS = [
  'websitePassword',
  'emergencyContacts',
  'dayVendorContacts',
  'contactPerson',
  'celebrant',
  'license',
];

/**
 * WeddingDetails.music is NOT in GUEST_SAFE_WEDDING_FIELDS above —
 * deliberately, unlike every other object field, which is copied wholesale.
 * music also holds spotifyConnection ({accessToken, refreshToken,
 * expiresAt, ...} — the couple's real, usable Spotify OAuth tokens,
 * written by api/spotify-callback.js) and spotifyUserId. A flat top-level
 * allowlist can only ever say "include this whole object or don't" — it
 * has no way to strip one sub-field out of an object it includes, so
 * `music` needs its own nested picker instead (security audit, 2026-08-07:
 * both api/wedding-by-slug.js and api/rsvp-lookup.js were shipping
 * spotifyConnection verbatim to anonymous callers via the old flat entry).
 *
 * Allowlist here too, not a denylist on spotifyConnection specifically —
 * same reasoning as the file-level allowlist above. Verified by grepping
 * every guest-facing page that reads `weddingDetails.music.*`
 * (GuestMusic.jsx, MultiPageWeddingWebsite.jsx): only these three fields
 * are ever actually read. Add a field here only when a real guest-facing
 * read site needs it — requestsRequireApproval/playlists/notes are on the
 * live schema but have no current guest-facing reader, so they stay out
 * until one exists.
 */
const MUSIC_SAFE_FIELDS = ['guestRequestsEnabled', 'requestsClosedDate', 'requestMessage'];

function pickGuestSafeMusic(music) {
  const out = {};
  for (const field of MUSIC_SAFE_FIELDS) {
    if (field in music) out[field] = music[field];
  }
  return out;
}

/**
 * Builds the guest-safe payload for a single WeddingDetails record: only
 * the allowlisted fields, plus a computed passwordProtected boolean in
 * place of the real password. Never mutates the input.
 *
 * @param {object} wedding — a full WeddingDetails record from Base44
 * @returns {object}
 */
export function pickGuestSafeFields(wedding) {
  const out = {};
  for (const field of GUEST_SAFE_WEDDING_FIELDS) {
    if (NEVER_RETURN_FIELDS.includes(field)) continue; // defensive, should never trigger
    if (field in wedding) out[field] = wedding[field];
  }
  if (wedding.music) out.music = pickGuestSafeMusic(wedding.music);
  // Same source of truth as the gate itself — a wedding whose gate fails open
  // must not tell the guest it is protected, or the site reports a lock the
  // server is not enforcing.
  out.passwordProtected = websiteGateIsOn(wedding).on;
  return out;
}

/**
 * Is the website password gate actually on for this wedding?
 *
 * `websitePasswordEnabled` is the single source of truth for the gate;
 * `websitePassword` is the credential and must never be used to infer
 * enabled/disabled. Inferring it is what forced the `' '` and `'password'`
 * sentinel values the client used to write — see
 * src/lib/websitePasswordGate.js.
 *
 * FAILS OPEN when enabled is true but no credential is stored. Ratified
 * 2026-08-17, reasoning in scratchpad/DECISION-LOG.md: failing closed would
 * lock every guest out of a live wedding site with no self-service recovery,
 * while failing open exposes a site whose password was never chosen and so
 * was never given to anyone. The UI makes that state unreachable
 * (useWebsitePasswordGate never persists enabled without a credential), so
 * this branch is a defensive line, not a routine path — and the caller
 * logs it precisely because it should never be reached.
 *
 * @param {object} wedding
 * @returns {{ on: boolean, failedOpen: boolean }}
 */
export function websiteGateIsOn(wedding) {
  const enabled = wedding?.websitePasswordEnabled === true;
  const hasCredential = !!wedding?.websitePassword?.trim();
  return { on: enabled && hasCredential, failedOpen: enabled && !hasCredential };
}

/**
 * Server-side password comparison — the stored websitePassword never leaves
 * this function's scope for a caller to inspect; only the boolean match
 * result is returned.
 *
 * Returns true (access granted) whenever the gate is not on, which covers
 * both "protection disabled" and the fail-open case above.
 *
 * @param {object} wedding
 * @param {string} candidate
 * @returns {boolean}
 */
export async function verifyWeddingPassword(wedding, candidate) {
  if (!websiteGateIsOn(wedding).on) return true;
  // Async and constant-time as of Step 2b stage (iii): the stored value is a
  // scrypt hash, and scrypt is deliberately slow. See websitePasswordHash.js
  // for why a hash rather than the AES-GCM encryption every other sensitive
  // field on this entity uses.
  return verifyWebsitePassword(wedding.websitePassword, candidate);
}
