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

/**
 * playlists[] joined the guest-safe set on 2026-08-18. The note above said it
 * stayed out "until a real guest-facing read site needs one" — the music
 * rebuild created exactly that: the couple pastes a playlist link and guests
 * are meant to hear it, which they could not, because this picker dropped the
 * field before it ever reached the page.
 *
 * Each entry is reduced to the two fields the guest page renders. The stored
 * item also carries id/enabled/trackCount/coverImage and the legacy
 * spotifyPlaylistId; none is sensitive, but the whole point of this file is
 * that "not sensitive today" is not the test — a guest gets what a guest
 * needs. Disabled playlists are dropped entirely rather than sent with a flag.
 */
const PLAYLIST_SAFE_FIELDS = ['playlistUrl', 'name'];

function pickGuestSafePlaylists(playlists) {
  if (!Array.isArray(playlists)) return [];
  return playlists
    .filter((p) => p && p.enabled !== false && p.playlistUrl)
    .map((p) => {
      const out = {};
      for (const field of PLAYLIST_SAFE_FIELDS) {
        if (field in p) out[field] = p[field];
      }
      return out;
    });
}

function pickGuestSafeMusic(music) {
  const out = {};
  for (const field of MUSIC_SAFE_FIELDS) {
    if (field in music) out[field] = music[field];
  }
  const playlists = pickGuestSafePlaylists(music.playlists);
  if (playlists.length) out.playlists = playlists;
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
  // "does this site have a password" — NOT "are you locked out". This is
  // reached only on the success path, so the caller is authorised by
  // definition; locked is stated explicitly rather than left absent so the
  // contract is total and no client has to infer it from a missing key.
  out.passwordProtected = websiteGateIsOn(wedding).on;
  out.locked = false;
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

/**
 * The gate, for guest WRITE endpoints. Returns true when the write must be
 * refused. Callers do:
 *
 *   if (await guestGateBlocks(wedding, password, tag)) {
 *     return res.status(403).json({ error: GUEST_GATE_MESSAGE, passwordRequired: true });
 *   }
 *
 * NAMED FOR ITS UN-AWAITED FAILURE MODE. RULE 7 exists because making
 * verifyWeddingPassword async turned `!verifyWeddingPassword(...)` into
 * `!Promise` -> false, and the gate admitted everyone — silently, with no
 * error and no failing type. The direction of that collapse is a function of
 * the name. A Promise is truthy, so a forgotten `await` here refuses EVERY
 * write on a protected wedding: loud, immediate, caught by the first test
 * that exercises the happy path. The same mistake against a
 * `guestGateAllows` helper would fail open and be invisible. When a boolean
 * guard must be async, name it so that truthy means DENY.
 *
 * WHY A 403 HERE AND SILENT-IGNORE ON READS (RULE 6a). 6a forbids an
 * existence oracle: a rejection that confirms the resource exists and is
 * protected. Two things make a write different.
 *
 * First, there is no oracle left to protect. api/wedding-by-slug.js already
 * answers `{ passwordProtected: true }` for any slug, by design — that is how
 * the unlock screen knows to render. Refusing a write discloses nothing that
 * one public GET does not already disclose, so the 6a rationale simply does
 * not apply.
 *
 * Second, silence would be actively harmful here in a way it never is on a
 * read. A read served empty looks like a wedding with no poll activity, which
 * costs the guest nothing. A write accepted and discarded tells a real guest
 * their song request, contact details or RSVP-link email went through when it
 * did not. The only people who reach this branch are an attacker, who learns
 * nothing new, and a legitimate guest whose sessionStorage was cleared, who
 * needs to be told to unlock the site again. Failing silently would trade a
 * disclosure we do not prevent anyway for a data-loss bug we would never
 * hear about.
 *
 * @param {object} wedding   resolved WeddingDetails row
 * @param {string} candidate candidate password from the POST body
 * @param {string} tag       log prefix, e.g. '[wedding-poll-vote]'
 * @returns {Promise<boolean>} true when the write must be refused
 */
export async function guestGateBlocks(wedding, candidate, tag) {
  const { on, failedOpen } = websiteGateIsOn(wedding);
  if (failedOpen) {
    console.error(`${tag} websitePasswordEnabled is true but no credential is stored for slug "${wedding?.slug}" — gate FAILED OPEN, write accepted. See scratchpad/DECISION-LOG.md.`);
  }
  if (!on) return false;
  if (await verifyWeddingPassword(wedding, candidate)) return false;
  // RULE 6c — silent to the caller is not silent to us.
  console.warn(`${tag} write refused for protected wedding "${wedding?.slug}": ${candidate ? 'wrong' : 'no'} website password supplied.`);
  return true;
}

/** Shown to a guest whose session lost the password. Sentence case, no jargon. */
export const GUEST_GATE_MESSAGE = 'This wedding website is password protected. Please reload the page and enter the password, then try again.';
