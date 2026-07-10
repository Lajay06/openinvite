/**
 * scripts/migrate-poll-entities.mjs
 *
 * One-time migration (fix/poll-entities-migration): copies existing
 * WeddingDetails.polls[].options[].votes counts and .comments[] into the
 * new PollVote/PollComment entities, so historical poll activity shows up
 * in the new live-aggregation reads (api/wedding-poll-results.js,
 * src/pages/Polls.jsx) alongside votes/comments cast after the migration.
 *
 * The old WeddingDetails.polls nested field is left completely untouched —
 * this script only ever CREATES PollVote/PollComment rows, never writes
 * back to WeddingDetails (no new field added to its schema either, per
 * "don't risk another schema-strip"). Re-running it is NOT safe in general
 * (it would duplicate every already-migrated vote/comment) — instead of a
 * run-marker field, it skips any wedding that already has ANY PollVote or
 * PollComment row for its id, on the assumption this runs once, shortly
 * after deploy, before real guest traffic accumulates. If real votes/
 * comments already came in for a wedding before this script runs, that
 * wedding's legacy counts will NOT be backfilled — check the console output
 * for skipped weddings and reconcile by hand if that matters for a given
 * couple.
 *
 * A vote COUNT has no per-voter identity to preserve, so each existing
 * count is synthesized into that many distinct PollVote rows, each with
 * its own unique, hashed synthetic guest_identifier
 * (`legacy-{weddingId}-{pollId}-{optionId}-{n}`) — distinct so aggregation
 * never collapses them into one voter, and hashed (same hashGuestIdentifier
 * used by the live endpoints) so it's indistinguishable from a real voter's
 * identifier under PollVote's read: null RLS.
 *
 * Usage:  node scripts/migrate-poll-entities.mjs [--dry-run]
 *
 * Requires .env.local (gitignored): BASE44_ADMIN_KEY, VITE_BASE44_APP_ID
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashGuestIdentifier } from '../api/_lib/pollAuth.js';

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
  console.log('  Poll entities one-time migration' + (DRY_RUN ? '  (DRY RUN)' : ''));
  console.log('═══════════════════════════════════════════════════════\n');

  const weddings = unwrapList(await adminFetch('GET', `/apps/${APP_ID}/entities/WeddingDetails`))
    .filter(w => Array.isArray(w.polls) && w.polls.length > 0 && !w.is_test);

  console.log(`Found ${weddings.length} wedding(s) with poll data.\n`);

  let totalVotesCreated = 0;
  let totalCommentsCreated = 0;
  let weddingsMigrated = 0;
  let weddingsSkipped = 0;

  for (const wedding of weddings) {
    const existingQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
    const [existingVotes, existingComments] = await Promise.all([
      adminFetch('GET', `/apps/${APP_ID}/entities/PollVote?q=${existingQuery}`),
      adminFetch('GET', `/apps/${APP_ID}/entities/PollComment?q=${existingQuery}`),
    ]);
    if (unwrapList(existingVotes).length > 0 || unwrapList(existingComments).length > 0) {
      weddingsSkipped++;
      console.log(`⏭  ${wedding.slug || wedding.id} — already has PollVote/PollComment rows, skipping`);
      continue;
    }

    console.log(`→ ${wedding.slug || wedding.id} (${wedding.polls.length} poll(s))`);
    let votesForWedding = 0;
    let commentsForWedding = 0;

    for (const poll of wedding.polls) {
      const pollId = poll.id;
      if (!pollId) continue;

      for (const option of poll.options || []) {
        const count = Number(option.votes) || 0;
        for (let n = 0; n < count; n++) {
          const syntheticVoterId = `legacy-${wedding.id}-${pollId}-${option.id}-${n}`;
          if (!DRY_RUN) {
            await adminFetch('POST', `/apps/${APP_ID}/entities/PollVote`, {
              wedding_id: wedding.id,
              poll_id: pollId,
              option_id: option.id,
              guest_identifier: hashGuestIdentifier(syntheticVoterId),
            });
          }
          votesForWedding++;
        }
      }

      for (const comment of poll.comments || []) {
        const text = typeof comment === 'string' ? comment : comment?.text;
        if (!text) continue;
        if (!DRY_RUN) {
          await adminFetch('POST', `/apps/${APP_ID}/entities/PollComment`, {
            wedding_id: wedding.id,
            poll_id: pollId,
            text,
          });
        }
        commentsForWedding++;
      }
    }

    console.log(`  ${votesForWedding} vote(s), ${commentsForWedding} comment(s) migrated`);
    totalVotesCreated += votesForWedding;
    totalCommentsCreated += commentsForWedding;
    weddingsMigrated++;
  }

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`  Weddings migrated: ${weddingsMigrated}  |  skipped (already done): ${weddingsSkipped}`);
  console.log(`  PollVote rows created: ${totalVotesCreated}`);
  console.log(`  PollComment rows created: ${totalCommentsCreated}`);
  if (DRY_RUN) console.log('  (dry run — nothing was written)');
  console.log('───────────────────────────────────────────────────────\n');
}

run().catch(err => {
  console.error(`\n✗ Migration failed: ${err.message}`);
  process.exit(1);
});
