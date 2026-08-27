/**
 * scripts/reset-test-plan.mjs
 *
 * Resets ONLY the test account's `plan` field to 'free' (clearing
 * planActivatedAt too), so a subsequent real Stripe test-mode checkout can
 * prove the free → paid flip end-to-end. Deliberately narrow — unlike
 * scripts/reset-test-account.mjs (which wipes the whole account's data),
 * this touches nothing else: no guests, no WeddingDetails, no onboarding
 * flag.
 *
 * Reuses the EXACT same Base44 admin write path api/webhooks/stripe.js
 * itself calls (api/_lib/base44Admin.js's getBase44User/writeBase44UserPlan)
 * — not a reimplementation, the same functions, run with BASE44_ADMIN_KEY
 * rather than the user's own session token, same as the real webhook.
 *
 * Usage:  node scripts/reset-test-plan.mjs
 *
 * Requires .env.local (gitignored):
 *   BASE44_TEST_EMAIL=...
 *   BASE44_TEST_PASSWORD=...
 * And .env (or shell env) for BASE44_ADMIN_KEY, VITE_BASE44_APP_ID.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SAFETY LOCK — HARD-CODED TO ONE TEST EMAIL, SAME AS reset-test-account.mjs.
 * Only ever writes plan on the account that logs in as exactly this email.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBase44User, writeBase44UserPlan } from '../api/_lib/base44Admin.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env.local then .env (shell env / already-set values win over both).
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
  } catch { /* file may not exist — fine */ }
}

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const EMAIL = process.env.BASE44_TEST_EMAIL;
const PASS = process.env.BASE44_TEST_PASSWORD;
const ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const BASE = 'https://base44.app/api';

const LOCKED_TO_EMAIL = 'jaygalaxy23@gmail.com';

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
  return res.status === 204 ? null : res.json();
}

async function run() {
  console.log('\n  Reset test account plan → free\n');

  if (!EMAIL || !PASS) {
    console.error('✗ BASE44_TEST_EMAIL and BASE44_TEST_PASSWORD must be set in .env.local');
    process.exit(1);
  }
  if (!ADMIN_KEY) {
    console.error('✗ BASE44_ADMIN_KEY must be set (.env or shell env)');
    process.exit(1);
  }

  process.stdout.write('  Authenticating… ');
  const authRes = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASS });
  const token = authRes.access_token;
  if (!token) throw new Error('No access_token in login response');
  console.log(`✓  (${authRes.user?.email})`);

  process.stdout.write('  Verifying account identity (safety lock)… ');
  const me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
  const confirmedEmail = me?.email;
  if (confirmedEmail !== LOCKED_TO_EMAIL) {
    console.error(`\n⛔ SAFETY LOCK — authenticated as ${confirmedEmail}, permitted account is ${LOCKED_TO_EMAIL}. Refusing.`);
    process.exit(1);
  }
  console.log(`✓  ${confirmedEmail}  (id: ${me.id})`);

  const before = await getBase44User(me.id, ADMIN_KEY);
  console.log(`\n  BEFORE: plan = ${before?.plan ?? '(unknown)'}, planActivatedAt = ${before?.planActivatedAt ?? '(none)'}`);

  process.stdout.write('\n  Writing plan: free via writeBase44UserPlan (same admin path the webhook uses)… ');
  const result = await writeBase44UserPlan({ userId: me.id, plan: 'free', planActivatedAt: null, adminKey: ADMIN_KEY });
  if (!result.ok) {
    console.error(`\n✗ Write failed: status ${result.status ?? '(none)'} — ${result.body || result.error}`);
    process.exit(1);
  }
  console.log('✓');

  const after = await getBase44User(me.id, ADMIN_KEY);
  console.log(`\n  AFTER:  plan = ${after?.plan ?? '(unknown)'}, planActivatedAt = ${after?.planActivatedAt ?? '(none)'}`);
  console.log(`\n  ✅ ${confirmedEmail} is back to plan: free. Ready for a fresh checkout to prove the flip.\n`);
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
