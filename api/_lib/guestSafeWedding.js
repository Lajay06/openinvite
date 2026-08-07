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
  out.passwordProtected = !!wedding.websitePassword?.trim();
  return out;
}

/**
 * Server-side password comparison — the plaintext websitePassword never
 * leaves this function's scope for a caller to inspect; only the boolean
 * match result is returned.
 *
 * @param {object} wedding
 * @param {string} candidate
 * @returns {boolean}
 */
export function verifyWeddingPassword(wedding, candidate) {
  const real = wedding.websitePassword?.trim();
  if (!real) return true; // not password-protected
  return typeof candidate === 'string' && candidate.trim() === real;
}
