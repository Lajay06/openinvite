/**
 * scripts/migrate-guest-pii.mjs
 *
 * Guest family migration: write encrypted_guest_pii on every row that does not
 * have one.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate-guest-pii.mjs                    # dry run
 *   node --env-file=.env.local scripts/migrate-guest-pii.mjs --execute \
 *        --expect-rows=<n>                                                      # writes
 *
 * DRY RUN IS THE DEFAULT.
 *
 * ── SCOPE, precisely ────────────────────────────────────────────────────────
 * This script WRITES BLOBS AND NULLS NOTHING. Every plaintext column is left
 * exactly as it is. Nulling them is Track D's separate script, deliberately —
 * the same separation Track E used, for the same reason: adding a derived
 * column is trivially re-runnable, destroying the only remaining copy is not,
 * and folding the destructive step in as a flag on the safe tool is how an
 * --execute gets typed with the wrong intent.
 *
 * ── PER-ROW TWO-PHASE ───────────────────────────────────────────────────────
 * For each row, in order:
 *   1. write the blob, built from that row's current plaintext
 *   2. INDEPENDENT RE-READ of the row from Base44
 *   3. assert the blob decrypts and all TEN fields match the still-present
 *      plaintext
 * A row that fails phase 3 aborts the whole run. Phase 2 is a genuine re-read
 * rather than trusting the write's response, because the thing being verified
 * is what Base44 stored, not what we sent.
 *
 * Verifying against still-present plaintext is only possible because this
 * migration nulls nothing. That is the argument for the two-script split: by
 * the time Track D destroys the plaintext, this check has already been made
 * and recorded, and D re-makes it per row immediately before destroying.
 *
 * ── Counting (gotcha #19) ───────────────────────────────────────────────────
 * One large-limit fetch, deduped by id. skip pagination overlaps and omits, and
 * --expect-rows is only as good as the number it compares against.
 *
 * ── No shape assumptions ────────────────────────────────────────────────────
 * Field values are censused and reported, never filtered on. A row whose name
 * is an empty string, or whose email is missing, migrates like any other.
 *
 * PII values are never printed. Blob lengths are; contents are not.
 */

import { buildGuestPiiBlob, readGuestPiiBlob } from '../api/_lib/guestPii.js';
import { PII_FIELDS, BLOB_FIELD } from '../api/_lib/guestProtectedFields.js';
import { shouldRetry, backoffMs } from './lib/retryPolicy.mjs';

const BASE44 = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const FETCH_LIMIT = 1000;
const WRITE_DELAY_MS = 150;
const MAX_RETRIES = 4;

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const expectArg = args.find(a => a.startsWith('--expect-rows='));
const EXPECT = expectArg ? Number(expectArg.split('=')[1]) : null;

function die(msg) { console.error(`\nABORTED: ${msg}\n`); process.exit(1); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(method, path, token, body) {
  const res = await fetch(`${BASE44}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}
const unwrap = (p) => Array.isArray(p) ? p : (p?.data || p?.results || []);

async function writeWithRetry(path, token, patch) {
  let attempt = 0;
  for (;;) {
    try { return await api('PUT', path, token, patch); }
    catch (err) {
      if (!shouldRetry(err, attempt, MAX_RETRIES)) throw err;
      attempt++;
      const ms = backoffMs(attempt, WRITE_DELAY_MS);
      console.log(`    429 — retry ${attempt}/${MAX_RETRIES} in ${ms}ms`);
      await sleep(ms);
    }
  }
}

async function fetchAllGuests(token, ownerId) {
  const q = encodeURIComponent(JSON.stringify({ created_by_id: ownerId }));
  const rows = unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${q}&limit=${FETCH_LIMIT}`, token));
  if (rows.length >= FETCH_LIMIT) die(`row count reached the ${FETCH_LIMIT} fetch limit — skip pagination is unreliable (gotcha #19). Raise FETCH_LIMIT.`);
  return [...new Map(rows.map(g => [g.id, g])).values()];
}
async function fetchOne(id, token) {
  const rows = unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${encodeURIComponent(JSON.stringify({ id }))}`, token));
  return rows[0] || null;
}

if (!process.env.BASE44_ADMIN_KEY) die('BASE44_ADMIN_KEY is not set — the blob cannot be built.');
if (EXECUTE && EXPECT === null) die('--execute requires --expect-rows=<n> (STANDING-RULES RULE 8).');

const email = process.env.BASE44_TEST_EMAIL, password = process.env.BASE44_TEST_PASSWORD;
if (!email || !password) die('BASE44_TEST_EMAIL / BASE44_TEST_PASSWORD required — Guest.update is owner-scoped.');

const login = await fetch(`${BASE44}/apps/${APP_ID}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
}).then(r => r.json());
const token = login.access_token, ownerId = login.user?.id;
if (!token || !ownerId) die('login failed');

console.log(`\nGuest PII migration — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log('SCOPE: writes blobs only. Nulls nothing. Plaintext columns are Track D\'s job.\n');
console.log(`owner: ${ownerId}`);

const guests = await fetchAllGuests(token, ownerId);
const targets = guests.filter(g => !g[BLOB_FIELD]);
const already = guests.filter(g => g[BLOB_FIELD]);

console.log('\nSCAN');
console.log(`  guest rows (deduped single fetch) : ${guests.length}`);
console.log(`  already migrated                  : ${already.length}`);
console.log(`  TO MIGRATE                        : ${targets.length}`);

// Census only — never a filter. A row with no PII at all still gets a blob, so
// that "migrated" means the same thing for every row.
const census = {};
for (const f of PII_FIELDS) census[f] = targets.filter(g => g[f] !== undefined && g[f] !== null && g[f] !== '').length;
const noPiiAtAll = targets.filter(g => PII_FIELDS.every(f => !g[f])).length;
console.log(`  field census (reported, not filtered on):`);
for (const f of PII_FIELDS) console.log(`     ${f.padEnd(32)} ${census[f]}`);
console.log(`     rows with NO pii at all          ${noPiiAtAll}  (migrated anyway — "migrated" must mean one thing)`);

if (EXPECT !== null && targets.length !== EXPECT) {
  die(`--expect-rows=${EXPECT} but ${targets.length} rows need migrating. Nothing written.`);
}

if (!EXECUTE) {
  console.log('\nDRY RUN — no writes performed.');
  console.log(`To execute:  node --env-file=.env.local scripts/migrate-guest-pii.mjs --execute --expect-rows=${targets.length}\n`);
  process.exit(0);
}

// ── execute: per-row two-phase ──────────────────────────────────────────────
let ok = 0; const failed = [];
for (const g of targets) {
  const pii = {};
  for (const f of PII_FIELDS) pii[f] = g[f] ?? null;

  try {
    // phase 1 — write
    await writeWithRetry(`/apps/${APP_ID}/entities/Guest/${g.id}`, token, { [BLOB_FIELD]: buildGuestPiiBlob(pii) });

    // phase 2 — independent re-read (not the write's own response)
    const fresh = await fetchOne(g.id, token);
    if (!fresh) throw new Error('row not found on re-read');

    // phase 3 — round-trip all ten against the still-present plaintext
    const back = readGuestPiiBlob(fresh[BLOB_FIELD]);
    if (!back) throw new Error('blob did not decrypt on re-read');
    const mismatched = PII_FIELDS.filter(f => (back[f] ?? null) !== (fresh[f] ?? null));
    if (mismatched.length > 0) throw new Error(`round-trip mismatch on: ${mismatched.join(', ')}`);
    if (Object.keys(back).length !== PII_FIELDS.length) throw new Error(`blob has ${Object.keys(back).length} keys, expected ${PII_FIELDS.length}`);

    ok++;
  } catch (err) {
    failed.push({ id: g.id, error: err.message.slice(0, 140) });
    console.error(`\n  ROW FAILED ${g.id}: ${err.message.slice(0, 160)}`);
    die(`row ${g.id} failed the per-row verification after ${ok} successful row(s). Stopping rather than continuing — a migration that presses on past a verification failure is not a verified migration.`);
  }
  await sleep(WRITE_DELAY_MS);
}
console.log(`\nWRITE  migrated ${ok}/${targets.length}`);

// ── final independent verification ─────────────────────────────────────────
const after = await fetchAllGuests(token, ownerId);
const stillUnmigrated = after.filter(g => !g[BLOB_FIELD]);
const plaintextLost = PII_FIELDS.reduce((n, f) =>
  n + (guests.filter(g => g[f]).length - after.filter(g => g[f]).length), 0);
const badRoundTrip = after.filter(g => {
  if (!g[BLOB_FIELD]) return false;
  const b = readGuestPiiBlob(g[BLOB_FIELD]);
  return !b || PII_FIELDS.some(f => (b[f] ?? null) !== (g[f] ?? null));
});

console.log('\nVERIFY (independent re-read of every row)');
console.log(`  rows still unmigrated             : ${stillUnmigrated.length}  ${stillUnmigrated.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  blobs disagreeing with plaintext  : ${badRoundTrip.length}  ${badRoundTrip.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  plaintext values lost             : ${plaintextLost}  ${plaintextLost === 0 ? 'OK (this script nulls nothing)' : 'PROBLEM'}`);
process.exit(stillUnmigrated.length === 0 && badRoundTrip.length === 0 && plaintextLost === 0 && failed.length === 0 ? 0 : 1);
