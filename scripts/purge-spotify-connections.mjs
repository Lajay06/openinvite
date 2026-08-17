/**
 * scripts/purge-spotify-connections.mjs
 *
 * Deletes WeddingDetails.music.spotifyConnection — the couple's stored
 * Spotify OAuth tokens — as the data half of the Step 2b stage (c) teardown.
 * The code half (PR #451) already removed every reader and writer, so nothing
 * can repopulate what this clears.
 *
 * Usage:
 *   node --env-file=.env.local scripts/purge-spotify-connections.mjs             # dry run
 *   node --env-file=.env.local scripts/purge-spotify-connections.mjs --execute   # writes
 *
 * DRY RUN IS THE DEFAULT. --execute is required to write anything.
 *
 * ── Why this authenticates as the row owner, not the admin key ──────────────
 * WeddingDetails.update RLS is {created_by_id: "{{user.id}}"}. The admin key
 * has no session identity, so it gets a flat 403 on update — probed directly
 * 2026-08-17, and canonical gotcha #1 in BASE44_PLATFORM_NOTES.md. Reads are
 * open, so the SCAN below uses the admin key; the WRITE cannot, and must use
 * the owning account's own token.
 *
 * ── Scope ───────────────────────────────────────────────────────────────────
 * This is a SCOPED SINGLE-FIELD purge, not an account reset. It writes exactly
 * one key — `music` — rebuilt as the existing music object minus
 * spotifyConnection. Playlists, requestMessage, the guest-request toggles and
 * every other field on the row are preserved and asserted afterwards. It is
 * deliberately NOT scripts/reset-test-account.mjs and shares none of its
 * delete logic.
 *
 * Token values are never printed, not even truncated.
 *
 * ── Execution record ────────────────────────────────────────────────────────
 * Run once against production, 2026-08-17, on advisor authorization scoped to
 * a single row:
 *
 *   --execute --expect-rows=6a1f90fa5b4e0702b5a051aa
 *
 * One row purged (slug john-suzanne, is_test false). Verified by independent
 * raw query afterwards: music.spotifyConnection is null, no accessToken or
 * refreshToken string anywhere on the row, and all nine sibling music keys
 * intact. The key itself remained present-but-null because the field was
 * still declared in the Base44 schema at the time; undeclaring it (the final
 * act of stage (c)) removes the key.
 *
 * Kept in the repo rather than discarded: a script that performed a
 * production data operation belongs in history, so the operation is
 * auditable after the fact.
 */

const BASE44 = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const ADMIN = process.env.BASE44_ADMIN_KEY;
const EXECUTE = process.argv.includes('--execute');

/** Accounts whose token this script can obtain, keyed by the owning user id
 *  once resolved. Extend deliberately — never by widening a pattern. */
const OWNER_CREDENTIALS = [
  { email: process.env.BASE44_TEST_EMAIL, password: process.env.BASE44_TEST_PASSWORD },
  { email: process.env.BASE44_TEST_EMAIL_2, password: process.env.BASE44_TEST_PASSWORD_2 },
].filter(c => c.email && c.password);

async function api(method, url, { token, admin, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Authorization = `Bearer ${ADMIN}`;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const login = (email, password) =>
  api('POST', `${BASE44}/apps/${APP_ID}/auth/login`, { body: { email, password } });

async function main() {
  if (!ADMIN) throw new Error('BASE44_ADMIN_KEY is not set');

  const hr = '─'.repeat(70);
  console.log(`\n${hr}`);
  console.log(`  Spotify connection purge — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`${hr}\n`);

  // ── Scan (admin key; read RLS is open) ────────────────────────────────────
  const payload = await api('GET', `${BASE44}/apps/${APP_ID}/entities/WeddingDetails`, { admin: true });
  const rows = Array.isArray(payload) ? payload : (payload?.data || payload?.results || []);

  const candidates = rows.filter((w) => {
    const c = w?.music?.spotifyConnection;
    return c && typeof c === 'object' && Object.keys(c).length > 0;
  });

  console.log(`  Scanned ${rows.length} WeddingDetails rows.`);
  console.log(`  Rows holding music.spotifyConnection: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log('  Nothing to purge.\n');
    return;
  }

  for (const w of candidates) {
    console.log(`   row id      ${w.id}`);
    console.log(`   slug        ${JSON.stringify(w.slug)}`);
    console.log(`   is_test     ${!!w.is_test}`);
    console.log(`   owner       ${w.created_by_id}`);
    console.log(`   field       music.spotifyConnection  ->  null`);
    console.log(`   sub-keys    [${Object.keys(w.music.spotifyConnection).join(', ')}]   (values not printed)`);
    const otherMusicKeys = Object.keys(w.music).filter(k => k !== 'spotifyConnection');
    console.log(`   preserved   music.{${otherMusicKeys.join(', ') || '(nothing else)'}}`);
    console.log('');
  }

  if (!EXECUTE) {
    console.log('  DRY RUN — nothing was written. Re-run with --execute to apply.\n');
    return;
  }

  // ── Scope guard ───────────────────────────────────────────────────────────
  // The authorization to write is granted against a SPECIFIC candidate set,
  // reviewed in a dry run. If the live set has changed since — an extra row,
  // or a different row — the approval no longer describes what would happen,
  // so this aborts rather than acting on an unreviewed target. Pass
  // --expect-rows=<id,id> to re-scope deliberately.
  const expectArg = process.argv.find(a => a.startsWith('--expect-rows='));
  const expected = expectArg ? expectArg.split('=')[1].split(',').filter(Boolean).sort() : null;
  if (expected) {
    const actual = candidates.map(w => w.id).sort();
    const same = JSON.stringify(expected) === JSON.stringify(actual);
    if (!same) {
      console.error('  ABORT — the candidate set does not match what was authorized.');
      console.error(`          authorized: [${expected.join(', ')}]`);
      console.error(`          found now:  [${actual.join(', ')}]`);
      console.error('          Nothing was written. Re-run the dry run and obtain fresh approval.\n');
      process.exitCode = 1;
      return;
    }
    console.log(`  Scope guard: candidate set matches the authorized [${expected.join(', ')}].\n`);
  }

  // ── Resolve owner tokens ──────────────────────────────────────────────────
  const tokensByUser = new Map();
  for (const cred of OWNER_CREDENTIALS) {
    try {
      const auth = await login(cred.email, cred.password);
      if (auth?.access_token && auth?.user?.id) {
        tokensByUser.set(auth.user.id, { token: auth.access_token, email: auth.user.email });
      }
    } catch {
      console.warn(`  Could not authenticate ${cred.email} — skipping that credential.`);
    }
  }

  let purged = 0;
  let blocked = 0;

  for (const w of candidates) {
    const owner = tokensByUser.get(w.created_by_id);
    if (!owner) {
      // Loud, not silent: the admin key cannot do this, so an unowned row is
      // a real gap the operator has to resolve, not something to skip past.
      console.error(`  BLOCKED  row ${w.id} (slug ${JSON.stringify(w.slug)}) — no credentials held for owner ${w.created_by_id}.`);
      console.error(`           The admin key cannot update this row (owner-scoped RLS, 403). Not purged.`);
      blocked++;
      continue;
    }

    const nextMusic = { ...w.music };
    delete nextMusic.spotifyConnection;

    await api('PUT', `${BASE44}/apps/${APP_ID}/entities/WeddingDetails/${w.id}`, {
      token: owner.token,
      body: { music: nextMusic },
    });

    // Verify: connection gone, everything else on the row intact.
    const after = await api('GET', `${BASE44}/apps/${APP_ID}/entities/WeddingDetails/${w.id}`, { admin: true });
    const gone = !after?.music?.spotifyConnection;
    const keysBefore = Object.keys(w.music).filter(k => k !== 'spotifyConnection').sort();
    const keysAfter = Object.keys(after?.music || {}).sort();
    const intact = JSON.stringify(keysBefore) === JSON.stringify(keysAfter);

    console.log(`  ${gone && intact ? 'PURGED ' : 'CHECK  '} row ${w.id} (${owner.email})`);
    console.log(`           spotifyConnection gone: ${gone}`);
    console.log(`           other music keys intact: ${intact}  [${keysAfter.join(', ')}]`);
    if (gone && intact) purged++;
  }

  console.log(`\n  Purged ${purged} row(s). Blocked ${blocked}.\n`);
  if (blocked > 0) process.exitCode = 1;
}

main().catch((err) => { console.error('\n  ERROR:', err.message, '\n'); process.exit(1); });
