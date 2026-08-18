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
import { pickGuestSafeFields, websiteGateIsOn, verifyWeddingPassword } from '../../api/_lib/guestSafeWedding.js';
import { hashWebsitePassword, verifyWebsitePassword, isHashedPassword } from '../../api/_lib/websitePasswordHash.js';
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
    // Step 2b stage (i): the credential alone no longer means "protected" —
    // websitePasswordEnabled is the source of truth. The dedicated cases
    // below cover every combination.
    websitePasswordEnabled: true,
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

  results.push(!('spotifyConnected' in (safe.music || {})) && !('requestsRequireApproval' in (safe.music || {}))
    ? pass('pickGuestSafeFields — no unlisted music field leaks through (allowlist, not denylist)', 'all absent')
    : fail('pickGuestSafeFields — no unlisted music field leaks through (allowlist, not denylist)', 'all absent', JSON.stringify(safe.music)));

  // playlists JOINED the allowlist 2026-08-18. It was excluded on the grounds
  // that no guest-facing reader existed; the music rebuild created one, and
  // until this change the couple's saved playlist link was filtered out here
  // and never reached the page. Reduced to the two fields the guest renders.
  const withPlaylists = pickGuestSafeFields({
    id: 'wed-playlists', slug: 'playlist-case',
    music: {
      guestRequestsEnabled: true,
      playlists: [
        { id: 'primary', name: 'Wedding playlist', playlistUrl: 'https://open.spotify.com/playlist/abc123',
          enabled: true, trackCount: 12, coverImage: 'https://example.com/x.jpg', spotifyPlaylistId: 'legacy123' },
        { id: 'off', name: 'Disabled', playlistUrl: 'https://open.spotify.com/playlist/off', enabled: false },
        { id: 'nolink', name: 'No link yet', enabled: true },
      ],
    },
  });
  const pls = withPlaylists.music?.playlists || [];

  results.push(pls.length === 1 && pls[0].playlistUrl === 'https://open.spotify.com/playlist/abc123'
    ? pass('pickGuestSafeFields — an enabled playlist with a link reaches the guest', pls[0].playlistUrl)
    : fail('pickGuestSafeFields — an enabled playlist with a link reaches the guest', '1 entry', JSON.stringify(pls)));

  results.push(pls.every((p) => Object.keys(p).every((k) => ['playlistUrl', 'name'].includes(k)))
    ? pass('pickGuestSafeFields — playlist entries carry ONLY playlistUrl and name', JSON.stringify(Object.keys(pls[0] || {})))
    : fail('pickGuestSafeFields — playlist entries carry ONLY playlistUrl and name', 'playlistUrl, name', JSON.stringify(pls)));

  results.push(!JSON.stringify(pls).includes('legacy123') && !JSON.stringify(pls).includes('trackCount')
    ? pass('pickGuestSafeFields — legacy spotifyPlaylistId and internals never reach the guest', 'absent')
    : fail('pickGuestSafeFields — legacy spotifyPlaylistId and internals never reach the guest', 'absent', JSON.stringify(pls)));

  results.push(!JSON.stringify(pls).includes('/playlist/off') && !pls.some((p) => p.name === 'No link yet')
    ? pass('pickGuestSafeFields — disabled and link-less playlists are dropped entirely', 'both dropped')
    : fail('pickGuestSafeFields — disabled and link-less playlists are dropped entirely', 'both dropped', JSON.stringify(pls)));

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

  // ── Step 2b stage (i): websitePasswordEnabled is the single source of truth ──
  // The credential must never be used to infer enabled/disabled — that
  // inference is what forced the ' ' and 'password' sentinel values. Each
  // combination is pinned here, including the fail-open case, so a future
  // change back to inferring from the credential fails loudly.
  const gateCases = [
    ['credential + enabled  -> protected',            { websitePassword: 'pw', websitePasswordEnabled: true },  true],
    ['credential, NOT enabled -> not protected',      { websitePassword: 'pw', websitePasswordEnabled: false }, false],
    ['credential, enabled absent -> not protected',   { websitePassword: 'pw' },                                false],
    ['enabled, NO credential -> not protected (fail open)', { websitePasswordEnabled: true },                   false],
    ['enabled, empty credential -> not protected',    { websitePassword: '', websitePasswordEnabled: true },    false],
    ['enabled, whitespace credential -> not protected', { websitePassword: '   ', websitePasswordEnabled: true }, false],
    ['legacy sentinel \'password\', no enabled flag -> not protected', { websitePassword: 'password' },         false],
    ['legacy sentinel \' \', no enabled flag -> not protected',        { websitePassword: ' ' },                 false],
  ];
  for (const [label, fields, expected] of gateCases) {
    const out = pickGuestSafeFields({ id: 'gate', slug: 'gate-case', ...fields });
    const leaked = 'websitePassword' in out;
    results.push(out.passwordProtected === expected && !leaked
      ? pass(`pickGuestSafeFields — gate: ${label}`, String(expected))
      : fail(`pickGuestSafeFields — gate: ${label}`, `passwordProtected=${expected}, credential absent`,
             JSON.stringify({ passwordProtected: out.passwordProtected, leaked })));
  }

  // ── websiteGateIsOn reports the fail-open case distinctly, so the endpoint
  //    can log it. "not protected" and "misconfigured and not protected" must
  //    stay distinguishable. ──
  const failOpen = websiteGateIsOn({ websitePasswordEnabled: true });
  const plainOff = websiteGateIsOn({ websitePasswordEnabled: false, websitePassword: 'pw' });
  results.push(failOpen.on === false && failOpen.failedOpen === true
                && plainOff.on === false && plainOff.failedOpen === false
    ? pass('websiteGateIsOn — flags the enabled-without-credential case as failedOpen', 'distinct')
    : fail('websiteGateIsOn — flags the enabled-without-credential case as failedOpen', 'failedOpen true only when enabled without credential',
           JSON.stringify({ failOpen, plainOff })));

  // ── verifyWeddingPassword: only a gate that is actually ON can reject ──
  // verifyWeddingPassword is ASYNC as of Step 2b stage (iii) — scrypt. Every
  // call must be awaited: an un-awaited call returns a Promise, which is
  // truthy, so `!verifyWeddingPassword(...)` is always false and the gate
  // would admit everyone. That is exactly how this test failed when the
  // function went async, which is the reason for the explicit guard below.
  const hashed = await hashWebsitePassword('hunter2');
  const onWedding = { websitePassword: hashed, websitePasswordEnabled: true };
  const verifyOk = await verifyWeddingPassword(onWedding, 'hunter2') === true
                && await verifyWeddingPassword(onWedding, 'nope') === false
                && await verifyWeddingPassword({ websitePassword: hashed }, 'nope') === true
                && await verifyWeddingPassword({ websitePasswordEnabled: true }, 'anything') === true;
  results.push(verifyOk
    ? pass('verifyWeddingPassword — rejects only when the gate is on; fail-open and disabled both admit', 'correct')
    : fail('verifyWeddingPassword — rejects only when the gate is on; fail-open and disabled both admit', 'correct', 'see guestSafeWedding.js'));

  results.push(typeof verifyWeddingPassword(onWedding, 'nope')?.then === 'function'
    ? pass('verifyWeddingPassword — returns a Promise, so an un-awaited call is a bug callers must not make', 'thenable')
    : fail('verifyWeddingPassword — returns a Promise, so an un-awaited call is a bug callers must not make', 'thenable', 'not a promise'));

  // ── scrypt hashing: format, salt uniqueness, verification, legacy plaintext ──
  const h1 = await hashWebsitePassword('same-password');
  const h2 = await hashWebsitePassword('same-password');
  const fmt = /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(h1);
  results.push(fmt
    ? pass('hashWebsitePassword — scrypt$<salt>$<digest>, hex, expected lengths', 'well formed')
    : fail('hashWebsitePassword — scrypt$<salt>$<digest>, hex, expected lengths', 'scrypt$32hex$128hex', h1.slice(0, 40)));

  results.push(h1 !== h2 && isHashedPassword(h1)
    ? pass('hashWebsitePassword — same password hashes differently (per-value random salt)', 'distinct')
    : fail('hashWebsitePassword — same password hashes differently (per-value random salt)', 'distinct digests', 'identical'));

  const hv = await verifyWebsitePassword(h1, 'same-password') === true
          && await verifyWebsitePassword(h1, 'Same-Password') === false
          && await verifyWebsitePassword(h1, '') === false
          && await verifyWebsitePassword(h1, '  same-password  ') === true;
  results.push(hv
    ? pass('verifyWebsitePassword — matches the right password, rejects wrong/empty, trims', 'correct')
    : fail('verifyWebsitePassword — matches the right password, rejects wrong/empty, trims', 'correct', 'see websitePasswordHash.js'));

  // The prefix is the migrated-vs-legacy discriminator, because unlike every
  // other sensitive field here the legacy plaintext is ITSELF a string.
  const legacy = await verifyWebsitePassword('plain-old-password', 'plain-old-password') === true
              && await verifyWebsitePassword('plain-old-password', 'wrong') === false
              && isHashedPassword('plain-old-password') === false
              && isHashedPassword(h1) === true;
  results.push(legacy
    ? pass('websitePasswordHash — legacy plaintext still verifies, and is distinguishable by the scrypt$ prefix', 'correct')
    : fail('websitePasswordHash — legacy plaintext still verifies, and is distinguishable by the scrypt$ prefix', 'correct', 'discriminator broken'));

  const malformed = await verifyWebsitePassword('scrypt$notahexsalt$deadbeef', 'anything') === false
                 && await verifyWebsitePassword('scrypt$', 'anything') === false;
  results.push(malformed
    ? pass('verifyWebsitePassword — a malformed stored hash returns false rather than throwing', 'false')
    : fail('verifyWebsitePassword — a malformed stored hash returns false rather than throwing', 'false', 'threw or matched'));

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
