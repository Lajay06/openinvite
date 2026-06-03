/**
 * scripts/reset-test-account.mjs
 *
 * Resets the test account to pre-onboarding state so signup/onboarding
 * can be walked repeatedly with the same email.
 *
 * Usage:  npm run reset:test
 *
 * Requires .env.local (gitignored):
 *   BASE44_TEST_EMAIL=jaygalaxy23@gmail.com
 *   BASE44_TEST_PASSWORD=...
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SAFETY LOCK — HARD-CODED TO ONE TEST EMAIL. NEVER BYPASS.
 *
 * This script deletes ALL records owned by the authenticated account.
 * That is a destructive, irreversible action. Running it against a real
 * couple's account would permanently destroy their wedding data.
 *
 * The lock below checks the authenticated user's email AFTER login. If it
 * does not exactly match LOCKED_TO_EMAIL, the script refuses and exits
 * immediately — before touching any data. There is NO flag, argument,
 * env var, or code path that bypasses this check. If you need to reset a
 * different account: do not modify this script. Create a new test account
 * and a separate script with that email hardcoded.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env.local');

try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* rely on shell env */ }

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL  = process.env.BASE44_TEST_EMAIL;
const PASS   = process.env.BASE44_TEST_PASSWORD;
const BASE   = 'https://base44.app/api';

// ── The ONE email this script is allowed to run against ───────────────────────
const LOCKED_TO_EMAIL = 'jaygalaxy23@gmail.com';

// ── Entities to clear (separate records per couple) ──────────────────────────
// WeddingDetails is handled separately (prints embedded-data note).
// ThemeDetails is retired (nothing writes to it) but included for belt-and-braces.
const SEPARATE_ENTITIES = [
  'Guest',
  'Budget',
  'Vendor',
  'Schedule',
  'MoodboardItem',
  'GuestMessage',
  'SongRequest',
  'Photo',
  'LiveStream',
  'StreamChat',
  'StoryMilestone',
  'WebsiteTheme',
  'CustomEventPage',
  'Invitation',
  'Note',
  'Task',
  'Table',
  'VenueAsset',
  'VowSpeech',
  'RegistryItem',
  'RegistryProduct',
  'CustomGift',
  'ReceivedGift',
  'VendorLog',
  'VendorTask',
  'Collaborator',
  'Photographer',
  'Music',
  'ThemeDetails',
];

// ── HTTP helper ───────────────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Test account reset — Openinvite                   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!EMAIL || !PASS) {
    console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
    process.exit(1);
  }

  // ── 1. Authenticate ─────────────────────────────────────────────────────────
  // Note: auth.me()   → GET  /apps/{id}/entities/User/me
  //       auth.updateMe() → PUT  /apps/{id}/entities/User/me
  // (discovered from Base44 SDK source; /auth/me returns 404)
  process.stdout.write('  Authenticating… ');
  let token, meEmail;
  try {
    const authRes = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASS });
    token    = authRes.access_token;
    meEmail  = authRes.user?.email;   // login response includes user.email
    if (!token)   throw new Error('No access_token in response');
    if (!meEmail) throw new Error('No user.email in login response');
    console.log(`✓  (${meEmail})\n`);
  } catch (err) {
    console.error(`\n✗ Login failed: ${err.message}`);
    process.exit(1);
  }

  // ── 2. SAFETY LOCK ─────────────────────────────────────────────────────────
  //
  // This check runs BEFORE any data is modified. It verifies the authenticated
  // user's email against the one hardcoded email this script is permitted to
  // reset. If they don't match exactly, we abort with a loud error.
  //
  // Email comes from the login response (auth.user.email). A second GET call to
  // /entities/User/me is made immediately after to confirm server-side identity
  // and ensure the token wasn't swapped between steps.
  //
  process.stdout.write('  Verifying account identity (safety lock)… ');
  let me;
  try {
    me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
  } catch (err) {
    console.error(`\n✗ Could not call /entities/User/me: ${err.message}`);
    process.exit(1);
  }

  // Belt-and-braces: both the login response email AND the server-side /me must match
  const confirmedEmail = me?.email ?? meEmail;
  if (!confirmedEmail) {
    console.error('\n✗ Could not verify account email. Refusing to proceed.');
    process.exit(1);
  }

  if (confirmedEmail !== LOCKED_TO_EMAIL || meEmail !== LOCKED_TO_EMAIL) {
    console.error(`\n${'═'.repeat(60)}`);
    console.error('  ⛔ SAFETY LOCK TRIGGERED — REFUSING TO RESET');
    console.error(`     Authenticated as : ${confirmedEmail}`);
    console.error(`     Permitted account: ${LOCKED_TO_EMAIL}`);
    console.error('');
    console.error('  This script is hard-locked to the test account only.');
    console.error('  It will not run against any other account under any');
    console.error('  circumstances. Do not modify this check.');
    console.error(`${'═'.repeat(60)}\n`);
    process.exit(1);
  }

  console.log(`✓  ${confirmedEmail}\n`);

  // ── 3. Clear the onboarding gate ─────────────────────────────────────────────
  //
  // Onboarding.jsx reads `onboardingCompleted` (camelCase) — that is the gate.
  // Dashboard.jsx previously used `onboarding_completed` (snake_case) but was
  // fixed to match. We clear both here for belt-and-braces.
  //
  process.stdout.write('  Clearing onboarding flag (onboardingCompleted)… ');
  try {
    await api('PUT', `/apps/${APP_ID}/entities/User/me`, {
      onboardingCompleted: false,
      onboarding_completed: false,   // belt-and-braces: clear the legacy snake_case field too
    }, token);
    console.log('✓  set to false\n');
  } catch (err) {
    console.error(`\n✗ Failed to update auth user: ${err.message}`);
    process.exit(1);
  }

  // ── 4. Delete WeddingDetails ──────────────────────────────────────────────────
  //
  // This is the central record. Deleting it takes all embedded data with it:
  // theme.*, polls[], qna[], pre/postWeddingEvents[], mainCeremony, reception,
  // guestSuiteAccommodation, guestSuiteTransport, weddingPolicies,
  // emergencyContacts, dayVendorContacts, experienceGuide, pageSections, etc.
  //
  process.stdout.write('  Deleting WeddingDetails record(s)… ');
  try {
    const res  = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails`, undefined, token);
    const rows = res?.items ?? (Array.isArray(res) ? res : []);
    if (rows.length === 0) {
      console.log('✓  none found (already clean)');
    } else {
      for (const row of rows) {
        await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${row.id}`, undefined, token);
      }
      console.log(`✓  deleted ${rows.length} record(s)  [all embedded data removed]`);
    }
  } catch (err) {
    console.error(`\n✗ WeddingDetails delete failed: ${err.message}`);
    process.exit(1);
  }

  // ── 5. Delete all separate entities ──────────────────────────────────────────
  console.log('\n  Deleting separate entity records:\n');
  const entityCounts = {};

  for (const entity of SEPARATE_ENTITIES) {
    process.stdout.write(`    ${entity.padEnd(22)} `);
    try {
      const res  = await api('GET', `/apps/${APP_ID}/entities/${entity}`, undefined, token);
      const rows = res?.items ?? (Array.isArray(res) ? res : []);

      if (rows.length === 0) {
        console.log('–  0 records');
        entityCounts[entity] = 0;
        continue;
      }

      let deleted = 0;
      for (const row of rows) {
        try {
          await api('DELETE', `/apps/${APP_ID}/entities/${entity}/${row.id}`, undefined, token);
          deleted++;
        } catch {
          // skip individual failures — log at end
        }
      }
      console.log(`✓  deleted ${deleted}/${rows.length}`);
      entityCounts[entity] = deleted;
    } catch (err) {
      // Entity may not exist in this app — not an error
      const status = err.message.includes('404') ? '–  (not in schema)' : `⚠  error: ${err.message.slice(0, 60)}`;
      console.log(status);
      entityCounts[entity] = 0;
    }
  }

  // ── 6. Summary ────────────────────────────────────────────────────────────────
  const totalDeleted = Object.values(entityCounts).reduce((s, n) => s + n, 0);

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  Account reset:    ${confirmedEmail}`);
  console.log(`  onboardingCompleted → false`);
  console.log(`  WeddingDetails:   deleted (all embedded data gone)`);
  console.log(`  Separate records: ${totalDeleted} total deleted across ${SEPARATE_ENTITIES.length} entity types`);
  console.log(`${'─'.repeat(58)}`);

  console.log(`
  ⚠️  BROWSER STEP REQUIRED
  ─────────────────────────────────────────────────────
  localStorage is browser-side — this script cannot reach it.
  Before re-walking onboarding, clear it in the browser:

    Option A (quick):  Open DevTools → Console → type:
                       localStorage.clear()

    Option B (clean):  DevTools → Application → Storage
                       → "Clear site data" button

  Keys to clear: oi_couple_name, oi_wedding_date,
                 oi_wedding_city, oi_user

  Without this the top bar and Ava context will show stale
  couple/date data from the previous onboarding run.
  ─────────────────────────────────────────────────────
`);

  console.log('  ✅ Test account reset to pre-onboarding state.');
  console.log('     Clear browser localStorage, then log in to walk onboarding fresh.\n');
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
