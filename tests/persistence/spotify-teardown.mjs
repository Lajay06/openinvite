/**
 * tests/persistence/spotify-teardown.mjs
 *
 * Replaces tests/persistence/spotify-oauth.mjs, which tested the OAuth
 * callback's login-CSRF `state` validation. That test was deleted with the
 * endpoint it covered, in the Step 2b stage (c) Spotify teardown.
 *
 * What remains worth guarding is the teardown itself. The whole point was to
 * remove every code path that can read or write
 * WeddingDetails.music.spotifyConnection, so that purging the stored tokens
 * is final rather than something the next OAuth connect quietly undoes.
 * These are static assertions over the source tree: cheap, no network, and
 * they fail loudly if any of it is reintroduced without a deliberate decision.
 *
 * Deliberately NOT asserted: that Spotify search is gone. It isn't, and must
 * not be. Search runs on the server's own client_credentials app token and
 * never touched a couple's account, so guest song requests keep working.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** Every source file under src/ and api/, so the sweeps below can't miss one. */
function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(js|jsx)$/.test(entry.name)) out.push(rel);
    }
  };
  walk('src');
  walk('api');
  return out;
}

export async function runSpotifyTeardown() {
  const results = [];

  // ── The OAuth endpoints must stay deleted ────────────────────────────────
  for (const gone of ['api/spotify-callback.js', 'api/spotify-session-fetch.js', 'api/_lib/spotifyAuth.js']) {
    results.push(!exists(gone)
      ? pass(`Spotify teardown — ${gone} stays deleted`, 'absent')
      : fail(`Spotify teardown — ${gone} stays deleted`, 'absent', 'file is back'));
  }

  // ── Search survives, and stays app-token only ────────────────────────────
  results.push(exists('api/spotify-search.js')
    ? pass('Spotify teardown — spotify-search.js is KEPT (guest song search depends on it)', 'present')
    : fail('Spotify teardown — spotify-search.js is KEPT (guest song search depends on it)', 'present', 'deleted'));

  const search = read('api/spotify-search.js');
  const usesAppToken = search.includes('client_credentials');
  const noUserTokens = !/\brefreshUserToken\b/.test(search) && !/isKnownSpotifyRefreshToken/.test(search);
  results.push(usesAppToken && noUserTokens
    ? pass('spotify-search.js — client_credentials only, no user-token or refresh path', 'app token only')
    : fail('spotify-search.js — client_credentials only, no user-token or refresh path', 'app token only',
           `client_credentials:${usesAppToken} noUserTokens:${noUserTokens}`));

  // ── Nothing anywhere may read or write the stored connection ─────────────
  // Comments are stripped first: several files legitimately explain the
  // teardown in prose, and a prose mention is not a code path.
  const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const offenders = sourceFiles().filter((rel) => {
    if (rel === 'api/_lib/guestSafeWedding.js') return false; // nested allowlist, defence in depth
    return /spotifyConnection/.test(stripComments(read(rel)));
  });
  results.push(offenders.length === 0
    ? pass('Spotify teardown — no code path reads or writes music.spotifyConnection', 'none')
    : fail('Spotify teardown — no code path reads or writes music.spotifyConnection', 'none', offenders.join(', ')));

  // ── And no client may call the removed endpoints ─────────────────────────
  const callers = sourceFiles().filter((rel) =>
    /['"`]\/api\/spotify-(callback|session-fetch)['"`]/.test(stripComments(read(rel))));
  results.push(callers.length === 0
    ? pass('Spotify teardown — nothing calls the removed OAuth endpoints', 'none')
    : fail('Spotify teardown — nothing calls the removed OAuth endpoints', 'none', callers.join(', ')));

  return results;
}
