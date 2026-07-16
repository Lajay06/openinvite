/**
 * scripts/cleanup-stray-test-records.mjs
 *
 * One-off admin script: finds every stray record the persistence test
 * harness has left behind in the live Base44 app (guests, wedding drafts,
 * tables, livestreams) — from the crashed-mid-test / unmarked-record gaps
 * fixed alongside this script — and deletes them.
 *
 * Usage:
 *   node scripts/cleanup-stray-test-records.mjs            (dry run — lists only)
 *   node scripts/cleanup-stray-test-records.mjs --delete    (deletes what was found)
 *
 * Always run without --delete first and review the list before re-running
 * with --delete.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SAFETY LOCKS — NEVER BYPASS.
 *
 * 1. Hard-coded to one test email (same convention as reset-test-account.mjs
 *    and reset-test-plan.mjs). The script refuses to run against any other
 *    authenticated account.
 * 2. Every query is additionally scoped to `created_by_id: <that account's
 *    own id>` — even if the is_test/name-prefix matching below had a bug,
 *    this account-ownership filter is a second, independent boundary that
 *    makes it structurally impossible for this script to see or delete a
 *    real customer's record, which always has a different created_by_id.
 * 3. A record only qualifies for deletion if it matches is_test:true OR its
 *    name/title field starts with __PERSISTENCE_TEST — not either alone
 *    trusted blindly across every entity (see ENTITY_CONFIGS below for
 *    exactly which signal each entity type supports).
 *
 * NOT COVERED — cannot be covered:
 * PollVote, PollComment, RsvpResponse, SongRequest are created by the real
 * anonymous public handlers (wedding-poll-vote.js etc.) with
 * created_by_id: 'anonymous' — identical to genuine guest activity. There is
 * no created_by_id to scope by (this script's core safety boundary doesn't
 * exist for these types), and their own delete RLS
 * (`{ created_by_id: '{{user.id}}' }`) can never be satisfied by any
 * credential, including BASE44_ADMIN_KEY (verified directly). Attempting to
 * bulk-match these by content would risk touching real guest data with no
 * ownership boundary to protect against it, so they are deliberately
 * excluded from this script. See the comment block at the top of
 * tests/persistence/anonymous-endpoints.mjs for the full explanation.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));

for (const file of ['.env.local', '.env']) {
  try {
    const raw = readFileSync(resolve(__dir, '..', file), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch { /* file may not exist */ }
}

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL  = process.env.BASE44_TEST_EMAIL;
const PASS   = process.env.BASE44_TEST_PASSWORD;
const BASE   = 'https://base44.app/api';

// ── The ONE email this script is allowed to run against ───────────────────────
const LOCKED_TO_EMAIL = 'jaygalaxy23@gmail.com';

const DELETE_MODE = process.argv.includes('--delete');

// Entity types the harness creates that are actually deletable (owned by the
// real test account, not an anonymous handler) — see NOT COVERED above for
// why PollVote/PollComment/RsvpResponse/SongRequest aren't in this list.
const ENTITY_CONFIGS = [
  { entity: 'WeddingDetails', nameField: 'couple1Name', supportsIsTest: true },
  { entity: 'Guest',          nameField: 'name',         supportsIsTest: true },
  { entity: 'Table',          nameField: 'name',          supportsIsTest: false }, // no is_test in schema
  { entity: 'LiveStream',     nameField: 'title',          supportsIsTest: true },
];

const NAME_PREFIX = '__PERSISTENCE_TEST';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function run() {
  if (!EMAIL || !PASS) {
    console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  Stray test-record ${DELETE_MODE ? 'CLEANUP (deleting)' : 'scan (dry run)'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  process.stdout.write('  Logging in… ');
  const auth = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASS });
  const token = auth.access_token;
  if (!token) throw new Error('No access_token in login response');
  console.log('✓');

  const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
  if (me.email !== LOCKED_TO_EMAIL) {
    console.error(`\n✗ SAFETY ABORT — authenticated as "${me.email}", not the locked test account "${LOCKED_TO_EMAIL}".`);
    console.error('  Refusing to scan/delete. This lock cannot be bypassed — see the file header.\n');
    process.exit(1);
  }
  console.log(`  Authenticated as ${me.email} (id=${me.id}) — the locked test account.\n`);

  const found = []; // { entity, id, name, matchedBy }

  for (const { entity, nameField, supportsIsTest } of ENTITY_CONFIGS) {
    process.stdout.write(`  Scanning ${entity}… `);
    const q = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));
    const rows = await api('GET', `/apps/${APP_ID}/entities/${entity}?q=${q}`, undefined, token);
    const list = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);

    const matches = list.filter(r => {
      const isTestMatch = supportsIsTest && r.is_test === true;
      const nameMatch = typeof r[nameField] === 'string' && r[nameField].startsWith(NAME_PREFIX);
      return isTestMatch || nameMatch;
    });

    for (const r of matches) {
      const isTestMatch = supportsIsTest && r.is_test === true;
      const nameMatch = typeof r[nameField] === 'string' && r[nameField].startsWith(NAME_PREFIX);
      const matchedBy = [isTestMatch && 'is_test:true', nameMatch && `${nameField} prefix`].filter(Boolean).join(' + ');
      found.push({ entity, id: r.id, name: r[nameField] ?? '(none)', matchedBy });
    }
    console.log(`${list.length} owned record(s), ${matches.length} match test markers`);
  }

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`  FOUND: ${found.length} stray test record(s)`);
  console.log(`${'─'.repeat(70)}\n`);

  if (found.length === 0) {
    console.log('  Nothing to clean up.\n');
    return;
  }

  for (const f of found) {
    console.log(`  [${f.entity}] id=${f.id}  name="${f.name}"  matched by: ${f.matchedBy}`);
  }

  if (!DELETE_MODE) {
    console.log(`\n  Dry run only — nothing deleted. Re-run with --delete to remove these ${found.length} record(s).\n`);
    return;
  }

  console.log(`\n  Deleting ${found.length} record(s)…\n`);
  let deleted = 0;
  let failed = 0;
  for (const f of found) {
    try {
      await api('DELETE', `/apps/${APP_ID}/entities/${f.entity}/${f.id}`, undefined, token);
      console.log(`  ✓ deleted [${f.entity}] ${f.id}`);
      deleted++;
    } catch (err) {
      console.log(`  ✗ FAILED to delete [${f.entity}] ${f.id}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  Deleted ${deleted}/${found.length}${failed ? `, ${failed} failed` : ''}.\n`);

  // ── After-state: re-scan to confirm ────────────────────────────────────────
  console.log('  Re-scanning to confirm after-state…\n');
  let remaining = 0;
  for (const { entity, nameField, supportsIsTest } of ENTITY_CONFIGS) {
    const q = encodeURIComponent(JSON.stringify({ created_by_id: me.id }));
    const rows = await api('GET', `/apps/${APP_ID}/entities/${entity}?q=${q}`, undefined, token);
    const list = Array.isArray(rows) ? rows : (rows?.data || rows?.results || []);
    const matches = list.filter(r => {
      const isTestMatch = supportsIsTest && r.is_test === true;
      const nameMatch = typeof r[nameField] === 'string' && r[nameField].startsWith(NAME_PREFIX);
      return isTestMatch || nameMatch;
    });
    remaining += matches.length;
    console.log(`  [${entity}] ${matches.length} test record(s) remaining`);
  }
  console.log(`\n  ${remaining === 0 ? '✓ All clear.' : `⚠️  ${remaining} record(s) still present — review manually.`}\n`);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
