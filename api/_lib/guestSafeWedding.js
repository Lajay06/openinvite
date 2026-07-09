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
  'heroVideoFile',
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
  'weddingPolicies',
  'polls',
  'qna',
  'music',
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
