#!/usr/bin/env node
/**
 * scripts/reset-orphaned-hashes.mjs
 *
 * ONE-TIME CLEANUP OF THE DIGESTS AND CIPHERTEXT THE 2026-10-11 ROTATION KILLED.
 *
 * OWNER-RUN ONLY, NEVER UNATTENDED, NEVER FROM A LANE. It writes to production.
 *
 *   npm run reset:orphaned-hashes              counts per store, then exits
 *   npm run reset:orphaned-hashes -- --confirm counts, resets, counts again
 *
 * ── WHY A RESET AND NOT A MIGRATION ───────────────────────────────────────
 *
 * Owner words 2026-10-11, "reset the lot", after the report established that a
 * migration is not available. Two reasons, and the second is the hard one:
 *
 *   · The ciphertext (encrypted_guest_level, encrypted_answers, the gift's
 *     *_enc fields) was encrypted under a key derived from the OLD admin key.
 *     That value cannot be recovered: Vercel's variable history lists edits,
 *     not values, and it was marked Sensitive. No key in existence opens it.
 *
 *   · The digests cannot even be MATCHED to the record they belong to. Finding
 *     the row for a guest means computing the OLD hash of that guest's id,
 *     which needs the old key. The rows carry nothing else identifying. So
 *     "recompute them from the plaintext ids" is not a smaller version of this
 *     job, it is impossible, and saying so plainly is the point of this header.
 *
 * ── WHAT IT TOUCHES, EXHAUSTIVELY ────────────────────────────────────────
 *
 *   PollVote.guest_identifier               set to null
 *   RsvpResponse.guest_id_hash              set to null
 *   RsvpResponse.encrypted_guest_level      set to null
 *   QuestionnaireResponse                   row deleted
 *   PlanGift (the single test row)           row deleted
 *
 * SongRequest needs nothing: its guestEmailHash and guestHash fields exist in
 * the schema but no row carries either, measured 0 of 242 on 2026-10-11, so the
 * key switch is free there. Both stop-link families are stateless, so they need
 * nothing either: the next email carries a link signed with APP_HASH_KEY. Links
 * already in someone's inbox stay broken, which no script can fix.
 *
 * NOTHING ELSE IS WRITTEN. Each update sends exactly the named field(s). Each
 * delete is by id, one row at a time, against an id this script itself read.
 *
 * ── WHY IT REFUSES WITHOUT THE NEW KEYS ──────────────────────────────────
 *
 * If APP_HASH_KEY and APP_ENC_KEY are not both set, the deployment this is
 * being run against has not had the key PR applied yet. Resetting first would
 * clear the evidence of what was orphaned while the code still writes digests
 * under a credential, so the next rotation does the same damage to the rows
 * written in between. Refuse, and say which variable is missing.
 */

import { readFileSync } from 'node:fs';

// ── ENV, FROM .env.local THE WAY EVERY OTHER SCRIPT HERE READS IT ─────────
try {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no .env.local; the real environment is expected to carry them */ }

const CONFIRM = process.argv.includes('--confirm');
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const ADMIN_KEY = process.env.BASE44_ADMIN_KEY || '';

// ── THE REFUSALS, BEFORE ANYTHING IS READ ─────────────────────────────────
const missing = ['APP_HASH_KEY', 'APP_ENC_KEY'].filter((k) => !(process.env[k] || ''));
if (missing.length) {
  console.error(`\n  REFUSING: ${missing.join(' and ')} not set.`);
  console.error('  This deployment has not had the key change applied, so a reset now would');
  console.error('  clear the evidence while the code still keys on a credential.\n');
  process.exit(1);
}
if (!ADMIN_KEY) {
  console.error('\n  REFUSING: BASE44_ADMIN_KEY not set, so nothing can be read or written.\n');
  process.exit(1);
}

const { adminFetch } = await import('../api/_lib/base44Admin.js');

/** Every row of one entity, in one request: `skip` pagination overlaps and omits. */
async function listAll(entity) {
  const res = await adminFetch(`/apps/${APP_ID}/entities/${entity}?limit=5000`, { adminKey: ADMIN_KEY });
  if (!res.ok) throw new Error(`${entity} list failed (${res.status})`);
  const body = await res.json();
  return Array.isArray(body) ? body : (body?.data || []);
}

const present = (row, field) => row && row[field] !== undefined && row[field] !== null && row[field] !== '';

/**
 * THE PLAN. One entry per store, naming the fields it may touch and nothing
 * else. `fields: null` means the row itself goes.
 */
const PLAN = [
  { entity: 'PollVote',              fields: ['guest_identifier'] },
  { entity: 'RsvpResponse',          fields: ['guest_id_hash', 'encrypted_guest_level'] },
  { entity: 'QuestionnaireResponse', fields: null, reason: 'both rows unreadable and unmatchable' },
  { entity: 'PlanGift',              fields: null, reason: 'the single row is a test row, owner ruling' },
];

async function counts() {
  const out = [];
  for (const step of PLAN) {
    const rows = await listAll(step.entity);
    if (step.fields) {
      const per = step.fields.map((f) => [f, rows.filter((r) => present(r, f)).length]);
      out.push({ ...step, total: rows.length, per, rows });
    } else {
      out.push({ ...step, total: rows.length, per: [['(whole row)', rows.length]], rows });
    }
  }
  // SongRequest IS REPORTED THOUGH IT IS NEVER TOUCHED, so a reader can see it
  // was considered rather than forgotten.
  const songs = await listAll('SongRequest');
  out.push({
    entity: 'SongRequest', fields: [], total: songs.length, rows: [],
    per: [['guestEmailHash', songs.filter((r) => present(r, 'guestEmailHash')).length],
          ['guestHash', songs.filter((r) => present(r, 'guestHash')).length]],
    note: 'not touched: nothing carries either field, so the key switch is free',
  });
  return out;
}

function report(label, snapshot) {
  console.log(`\n  ${label}`);
  for (const s of snapshot) {
    const parts = s.per.map(([f, n]) => `${f}=${n}`).join('  ');
    console.log(`    ${s.entity.padEnd(23)} total=${String(s.total).padEnd(6)} ${parts}${s.note ? `   (${s.note})` : ''}`);
  }
}

const before = await counts();
report('BEFORE, counts only:', before);

if (!CONFIRM) {
  console.log('\n  Nothing was written. To carry out the reset above:');
  console.log('    npm run reset:orphaned-hashes -- --confirm\n');
  process.exit(0);
}

console.log('\n  --confirm given. Writing.\n');
let cleared = 0, deleted = 0, failed = 0;

for (const step of PLAN) {
  const snapshot = before.find((s) => s.entity === step.entity);
  for (const row of snapshot.rows) {
    if (!row?.id) continue;
    try {
      if (step.fields) {
        // ONLY THE NAMED FIELDS. A row with none of them set is skipped, so an
        // untouched row is never rewritten just to prove it was visited.
        const payload = {};
        for (const f of step.fields) if (present(row, f)) payload[f] = null;
        if (!Object.keys(payload).length) continue;
        const res = await adminFetch(`/apps/${APP_ID}/entities/${step.entity}/${row.id}`,
          { method: 'PUT', body: payload, adminKey: ADMIN_KEY });
        if (res.ok) cleared += 1;
        else { failed += 1; console.error(`    ${step.entity} ${row.id.slice(0, 8)} clear failed (${res.status})`); }
      } else {
        const res = await adminFetch(`/apps/${APP_ID}/entities/${step.entity}/${row.id}`,
          { method: 'DELETE', adminKey: ADMIN_KEY });
        if (res.ok) deleted += 1;
        else { failed += 1; console.error(`    ${step.entity} ${row.id.slice(0, 8)} delete failed (${res.status})`); }
      }
    } catch (err) {
      failed += 1;
      console.error(`    ${step.entity} ${String(row.id).slice(0, 8)} threw: ${err.message}`);
    }
  }
}

console.log(`\n  ${cleared} row(s) cleared, ${deleted} row(s) deleted, ${failed} failure(s).`);
if (failed) {
  console.log('  A failure is expected on any row Base44 will not let the admin key write:');
  console.log('  an anonymous-owned row answers 404 to DELETE. Those rows stay, and the');
  console.log('  count above is the honest record of it.');
}

report('AFTER, counts only:', await counts());
console.log('');
process.exit(failed ? 1 : 0);
