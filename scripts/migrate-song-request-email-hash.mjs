/**
 * scripts/migrate-song-request-email-hash.mjs
 *
 * One-time migration (fix/song-request-email-hash): backfills
 * SongRequest.guestEmailHash (HMAC-SHA256 of the guest's email, via
 * api/_lib/questionnaireCrypto.js's hashId — same construction already
 * used for RsvpResponse.guest_id_hash) from the legacy plaintext
 * guestEmail field, then purges the plaintext value.
 *
 * Nothing reads SongRequest.guestEmail back once submitted — its only real
 * use was api/song-request-submit.js's limitOnePerGuest dedup check, which
 * only needs equality, not the plaintext value (confirmed via repo-wide
 * grep before this migration was written). Rows that already have a
 * guestEmailHash (submitted after the code fix shipped) are skipped, on
 * the same "runs once, shortly after deploy" assumption
 * migrate-rsvp-entities.mjs documents. Rows with no guestEmail at all
 * (guest requests that didn't require one) are left untouched.
 *
 * Usage:  node scripts/migrate-song-request-email-hash.mjs [--dry-run]
 *
 * Requires .env.local (gitignored): BASE44_ADMIN_KEY, VITE_BASE44_APP_ID
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashId } from '../api/_lib/questionnaireCrypto.js';

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

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SongRequest guestEmail → guestEmailHash migration' + (DRY_RUN ? '  (DRY RUN)' : ''));
  console.log('═══════════════════════════════════════════════════════\n');

  const all = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/SongRequest`));
  const withPlaintextEmail = all.filter(r => typeof r.guestEmail === 'string' && r.guestEmail.trim() !== '');

  console.log(`Found ${withPlaintextEmail.length} row(s) with a plaintext guestEmail (of ${all.length} total SongRequest rows).\n`);

  let migrated = 0;
  let skipped = 0;

  for (const row of withPlaintextEmail) {
    if (row.guestEmailHash) {
      console.log(`⏭  ${row.id} — already has guestEmailHash, skipping`);
      skipped++;
      continue;
    }

    const guestEmailHash = hashId(row.guestEmail.toLowerCase());
    console.log(`→ ${row.id} (${row.title || 'untitled'})`);

    if (!DRY_RUN) {
      await adminFetch('PUT', `/apps/${APP_ID}/entities/SongRequest/${row.id}`, {
        guestEmailHash,
        guestEmail: '',
      });
    }
    migrated++;
  }

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`  Migrated: ${migrated}  |  skipped (already done): ${skipped}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
  console.log('───────────────────────────────────────────────────────\n');
}

run().catch(err => {
  console.error(`\n✗ Migration failed: ${err.message}`);
  process.exit(1);
});
