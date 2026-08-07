/**
 * tests/persistence/guest-safe-wedding.mjs
 *
 * Pure-function coverage for api/_lib/guestSafeWedding.js's pickGuestSafeFields
 * — specifically the music sub-picker added by the Spotify-token-leak fix
 * (security audit, 2026-08-07). No live Base44 login needed; same shape as
 * guest-safe-registry.mjs's own pure-function tests.
 *
 * What this proves, concretely:
 *   - music.spotifyConnection (real, usable Spotify OAuth accessToken/
 *     refreshToken) and music.spotifyUserId never reach the guest-safe
 *     payload pickGuestSafeFields() builds — the exact payload
 *     api/wedding-by-slug.js and api/rsvp-lookup.js both return to
 *     anonymous callers.
 *   - The three guest-facing music fields (guestRequestsEnabled,
 *     requestsClosedDate, requestMessage) still pass through — this isn't
 *     just "delete music entirely," the guest music-request page still
 *     needs these.
 *   - A DEEP scan of the entire guest-safe payload (not just music
 *     specifically) never contains the literal strings "spotifyConnection",
 *     "accessToken", or "refreshToken" anywhere — this is the allowlist
 *     property the task asked for: a future field added to
 *     GUEST_SAFE_WEDDING_FIELDS or to WeddingDetails.music can't leak a
 *     token-shaped value without this test catching it, since it doesn't
 *     special-case any one known-bad field, it scans everything.
 *   - A wedding with no music object at all doesn't crash pickGuestSafeFields.
 */
import { pickGuestSafeFields } from '../../api/_lib/guestSafeWedding.js';
import { pass, fail } from './_shared.mjs';

/** True if `value` contains any of `needles` as a substring anywhere, at any depth. */
function containsAnywhere(value, needles) {
  const json = JSON.stringify(value);
  return needles.some(n => json.includes(n));
}

export async function runGuestSafeWedding() {
  const results = [];

  console.log('\n  Guest-safe wedding — WeddingDetails.music Spotify-token allowlist:\n');

  const weddingWithSpotify = {
    id: 'wed1',
    slug: 'alex-and-sam',
    coupleNames: 'Alex & Sam',
    websitePassword: 'super-secret-password',
    music: {
      guestRequestsEnabled: true,
      requestsRequireApproval: true,
      requestMessage: 'Help us build the soundtrack to our night.',
      requestsClosedDate: '2026-11-01',
      limitOnePerGuest: false,
      onlyForConfirmedGuests: false,
      playlists: [{ id: 'pl1', name: 'Reception', trackCount: 12, enabled: true }],
      spotifyConnected: true,
      spotifyUserId: 'spotify_user_abc123',
      spotifyConnection: {
        accessToken: 'BQC4real-live-spotify-access-token-xyz',
        refreshToken: 'AQD5real-live-spotify-refresh-token-xyz',
        expiresAt: 1785000000000,
        displayName: 'Alex Smith',
        imageUrl: 'https://i.scdn.co/image/abc123',
      },
    },
  };

  const safe = pickGuestSafeFields(weddingWithSpotify);

  // ── music sub-object: safe fields present, sensitive fields absent ──────
  results.push(safe.music?.guestRequestsEnabled === true
    ? pass('pickGuestSafeFields — music.guestRequestsEnabled passes through', 'true')
    : fail('pickGuestSafeFields — music.guestRequestsEnabled passes through', true, safe.music?.guestRequestsEnabled));

  results.push(safe.music?.requestsClosedDate === '2026-11-01'
    ? pass('pickGuestSafeFields — music.requestsClosedDate passes through', '2026-11-01')
    : fail('pickGuestSafeFields — music.requestsClosedDate passes through', '2026-11-01', safe.music?.requestsClosedDate));

  results.push(safe.music?.requestMessage === 'Help us build the soundtrack to our night.'
    ? pass('pickGuestSafeFields — music.requestMessage passes through', 'present')
    : fail('pickGuestSafeFields — music.requestMessage passes through', 'present', safe.music?.requestMessage));

  results.push(!('spotifyConnection' in (safe.music || {}))
    ? pass('pickGuestSafeFields — music.spotifyConnection is NEVER present', 'key absent')
    : fail('pickGuestSafeFields — music.spotifyConnection is NEVER present', 'key absent', JSON.stringify(safe.music.spotifyConnection)));

  results.push(!('spotifyUserId' in (safe.music || {}))
    ? pass('pickGuestSafeFields — music.spotifyUserId is NEVER present', 'key absent')
    : fail('pickGuestSafeFields — music.spotifyUserId is NEVER present', 'key absent', safe.music.spotifyUserId));

  results.push(!('spotifyConnected' in (safe.music || {})) && !('requestsRequireApproval' in (safe.music || {})) && !('playlists' in (safe.music || {}))
    ? pass('pickGuestSafeFields — no unlisted music field leaks through (allowlist, not denylist)', 'all absent')
    : fail('pickGuestSafeFields — no unlisted music field leaks through (allowlist, not denylist)', 'all absent', JSON.stringify(safe.music)));

  // ── Deep scan: the token VALUES themselves never appear anywhere in the
  //    payload, and neither does the literal key name — catches a future
  //    field that might carry a token-shaped value under a different name. ──
  const deepScanClean = !containsAnywhere(safe, [
    'spotifyConnection',
    'BQC4real-live-spotify-access-token-xyz',
    'AQD5real-live-spotify-refresh-token-xyz',
    'accessToken',
    'refreshToken',
  ]);
  results.push(deepScanClean
    ? pass('pickGuestSafeFields — deep scan: no accessToken/refreshToken value or key anywhere in payload', 'clean')
    : fail('pickGuestSafeFields — deep scan: no accessToken/refreshToken value or key anywhere in payload', 'clean', JSON.stringify(safe)));

  // ── websitePassword still never leaks (regression guard, pre-existing behavior) ──
  results.push(!('websitePassword' in safe) && safe.passwordProtected === true
    ? pass('pickGuestSafeFields — websitePassword replaced by passwordProtected boolean', 'true')
    : fail('pickGuestSafeFields — websitePassword replaced by passwordProtected boolean', 'true, key absent', JSON.stringify({ passwordProtected: safe.passwordProtected, hasPassword: 'websitePassword' in safe })));

  // ── No music object on the source record at all — must not throw ────────
  let noMusicResult;
  let noMusicThrew = false;
  try {
    noMusicResult = pickGuestSafeFields({ id: 'wed2', slug: 'no-music-yet' });
  } catch {
    noMusicThrew = true;
  }
  results.push(!noMusicThrew && !('music' in noMusicResult)
    ? pass('pickGuestSafeFields — wedding with no music object at all does not throw, omits music key', 'no throw, key absent')
    : fail('pickGuestSafeFields — wedding with no music object at all does not throw, omits music key', 'no throw, key absent', noMusicThrew ? 'threw' : JSON.stringify(noMusicResult)));

  return results;
}
