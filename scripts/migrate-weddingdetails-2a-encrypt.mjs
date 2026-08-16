/**
 * scripts/migrate-weddingdetails-2a-encrypt.mjs
 *
 * One-time migration (fix/weddingdetails-field-encryption, Step 2a):
 * backfills AES-256-GCM ciphertext for WeddingDetails.budget and
 * .contactPerson from their legacy plaintext object shape.
 *
 * Skips any row where the field is already a string (already encrypted —
 * same "runs once, shortly after deploy" assumption as
 * migrate-song-request-email-hash.mjs) or is null/empty (nothing to
 * encrypt). Rows are left completely untouched if neither field needs
 * migrating.
 *
 * Usage:  node scripts/migrate-weddingdetails-2a-encrypt.mjs [--dry-run]
 *
 * Requires .env.local (gitignored): BASE44_ADMIN_KEY, VITE_BASE44_APP_ID
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptPayload } from '../api/_lib/questionnaireCrypto.js';

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
} catch {
  // .env.local missing — rely on shell env vars
}

const DRY_RUN = process.argv.includes('--dry-run');
const BASE44_API = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

if (!ADMIN_KEY) {
  console.error('✗ BASE44_ADMIN_KEY must be set in .env.local');
  process.exit(1);
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function needsEncrypting(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return false; // already encrypted, or an empty string — nothing to do
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  WeddingDetails budget/contactPerson encryption migration' + (DRY_RUN ? '  (DRY RUN)' : ''));
  console.log('═══════════════════════════════════════════════════════\n');

  const all = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/WeddingDetails?limit=1000`));
  const real = all.filter(w => !w.is_test);

  const budgetToMigrate = real.filter(w => needsEncrypting(w.budget));
  const contactPersonToMigrate = real.filter(w => needsEncrypting(w.contactPerson));

  console.log(`Found ${real.length} real WeddingDetails row(s).`);
  console.log(`  budget needing encryption: ${budgetToMigrate.length}`);
  console.log(`  contactPerson needing encryption: ${contactPersonToMigrate.length}\n`);

  const byId = new Map();
  for (const w of budgetToMigrate) byId.set(w.id, { ...(byId.get(w.id) || {}), budget: w.budget });
  for (const w of contactPersonToMigrate) byId.set(w.id, { ...(byId.get(w.id) || {}), contactPerson: w.contactPerson });

  let migrated = 0;
  for (const [id, fields] of byId) {
    const update = {};
    if ('budget' in fields) update.budget = encryptPayload(fields.budget);
    if ('contactPerson' in fields) update.contactPerson = encryptPayload(fields.contactPerson);

    console.log(`→ ${id}${'budget' in fields ? ' [budget]' : ''}${'contactPerson' in fields ? ' [contactPerson]' : ''}`);
    if (!DRY_RUN) {
      await adminFetch('PUT', `/apps/${APP_ID}/entities/WeddingDetails/${id}`, update);
    }
    migrated++;
  }

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`  Rows migrated: ${migrated}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
  console.log('───────────────────────────────────────────────────────\n');
}

run().catch(err => {
  console.error(`\n✗ Migration failed: ${err.message}`);
  process.exit(1);
});
