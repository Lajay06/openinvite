/**
 * scripts/migrate-rsvp-entities.mjs
 *
 * One-time migration (fix/rsvp-entities-migration): copies existing
 * Guest.event_responses[] and whole-guest song_request/rsvp_note/
 * dietary_restrictions into the new RsvpResponse entity, so historical RSVP
 * data shows up in the new live-aggregation reads (api/rsvp-lookup.js,
 * src/lib/resolveMyWedding.js's getMyGuestsWithRsvp()) alongside RSVPs
 * submitted after the migration.
 *
 * Guest itself is left completely untouched — this script only ever
 * CREATES RsvpResponse rows, never writes back to Guest. Re-running it is
 * NOT safe in general (it would duplicate every already-migrated guest's
 * rows) — instead of a run-marker field, it skips any guest that already
 * has ANY RsvpResponse row, on the assumption this runs once, shortly after
 * deploy, before real guest traffic accumulates. If a guest already
 * resubmitted their RSVP for real before this script runs, their pre-
 * migration Guest data will NOT be backfilled (their post-migration
 * RsvpResponse rows are already the authoritative, newer source anyway).
 *
 * Usage:  node scripts/migrate-rsvp-entities.mjs [--dry-run]
 *
 * Requires .env.local (gitignored): BASE44_ADMIN_KEY, VITE_BASE44_APP_ID
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  console.log('  RSVP entities one-time migration' + (DRY_RUN ? '  (DRY RUN)' : ''));
  console.log('═══════════════════════════════════════════════════════\n');

  const allGuests = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/Guest`))
    .filter(g => !g.is_test);
  const guestsWithData = allGuests.filter(g =>
    (Array.isArray(g.event_responses) && g.event_responses.length > 0)
    || g.song_request || g.rsvp_note || g.dietary_restrictions
  );

  console.log(`Found ${guestsWithData.length} guest(s) with legacy RSVP data (of ${allGuests.length} total).\n`);

  // Resolve each distinct owner (created_by_id) to their WeddingDetails.id
  // once, the same way resolveGuestByToken does — most-recent non-test
  // record for that owner.
  const weddingIdByOwner = new Map();
  async function weddingIdFor(ownerId) {
    if (weddingIdByOwner.has(ownerId)) return weddingIdByOwner.get(ownerId);
    const q = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
    const weddings = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/WeddingDetails?q=${q}`))
      .filter(w => !w.is_test);
    const wedding = weddings.length > 0
      ? weddings.slice().sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]
      : null;
    weddingIdByOwner.set(ownerId, wedding?.id || null);
    return wedding?.id || null;
  }

  let totalRowsCreated = 0;
  let guestsMigrated = 0;
  let guestsSkipped = 0;

  for (const guest of guestsWithData) {
    const wedding_id = await weddingIdFor(guest.created_by_id);
    if (!wedding_id) {
      console.log(`⏭  ${guest.name || guest.id} — no resolvable WeddingDetails for its owner, skipping`);
      guestsSkipped++;
      continue;
    }

    const existingQuery = encodeURIComponent(JSON.stringify({ guest_id: guest.id }));
    const existing = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/RsvpResponse?q=${existingQuery}`));
    if (existing.length > 0) {
      console.log(`⏭  ${guest.name || guest.id} — already has RsvpResponse rows, skipping`);
      guestsSkipped++;
      continue;
    }

    console.log(`→ ${guest.name || guest.id}`);
    let rowsForGuest = 0;

    for (const er of guest.event_responses || []) {
      if (!er.event_id) continue;
      if (!DRY_RUN) {
        await adminFetch('POST', `/apps/${APP_ID}/entities/RsvpResponse`, {
          wedding_id,
          guest_id: guest.id,
          event_id: er.event_id,
          status: er.status || 'pending',
          meal_choice: er.meal_choice || null,
          plus_ones: er.plus_ones || 0,
          plus_one_names: er.plus_one_names || [],
        });
      }
      rowsForGuest++;
    }

    if (guest.song_request || guest.rsvp_note || guest.dietary_restrictions) {
      if (!DRY_RUN) {
        await adminFetch('POST', `/apps/${APP_ID}/entities/RsvpResponse`, {
          wedding_id,
          guest_id: guest.id,
          event_id: null,
          song_request: guest.song_request || '',
          note: guest.rsvp_note || '',
          dietary_restrictions: guest.dietary_restrictions || '',
        });
      }
      rowsForGuest++;
    }

    console.log(`  ${rowsForGuest} row(s) migrated`);
    totalRowsCreated += rowsForGuest;
    guestsMigrated++;
  }

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`  Guests migrated: ${guestsMigrated}  |  skipped (already done / no wedding): ${guestsSkipped}`);
  console.log(`  RsvpResponse rows created: ${totalRowsCreated}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
  console.log('───────────────────────────────────────────────────────\n');
}

run().catch(err => {
  console.error(`\n✗ Migration failed: ${err.message}`);
  process.exit(1);
});
