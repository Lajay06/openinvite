/**
 * scripts/null-rsvp-plaintext.mjs
 *
 * Track E3: null Guest.rsvp_link_id and Guest.plus_one_rsvp_link_id, leaving
 * only the hash (for lookup) and the ciphertext (for recovery).
 *
 * Usage:
 *   node --env-file=.env.local scripts/null-rsvp-plaintext.mjs                  # dry run
 *   node --env-file=.env.local scripts/null-rsvp-plaintext.mjs --execute \
 *        --expect-rows=<n>                                                       # writes
 *
 * DRY RUN IS THE DEFAULT.
 *
 * ── Why this is a separate script from the migration ────────────────────────
 * Different operation, different blast radius, different authorization. The
 * migration ADDS derived columns and is trivially re-runnable; this one
 * DESTROYS the only plaintext copy of 202 bearer capabilities and cannot be
 * undone. Folding a destructive step in as a flag on the safe tool is how an
 * --execute gets typed with the wrong intent.
 *
 * ── THE PRECONDITION THAT MATTERS ───────────────────────────────────────────
 * Before nulling ANY row, every target row must satisfy BOTH:
 *
 *     rsvp_link_id_hash === hashToken(rsvp_link_id)
 *     decryptToken(rsvp_link_id_enc) === rsvp_link_id
 *
 * One failure aborts the whole run without writing anything.
 *
 * This is not belt-and-braces, it is the entire safety argument. After this
 * script runs there is no second copy of the token: if the ciphertext does not
 * round-trip, that guest's invitation link is gone permanently and no amount
 * of later diagnosis recovers it. The only moment that check is worth anything
 * is immediately before the original is destroyed — verifying the recovery
 * path a week ago proves nothing about the row in front of you now.
 *
 * ── Row counting (gotcha #19) ───────────────────────────────────────────────
 * One large-limit fetch, deduped by id. skip pagination overlaps and omits, and
 * an --expect-rows guard is only as good as the number it compares against.
 *
 * Token values are never printed.
 */

import { hashToken, decryptToken } from '../api/_lib/rsvpTokenCrypto.js';
import { shouldRetry, backoffMs } from './lib/retryPolicy.mjs';

const BASE44 = 'https://base44.app/api';
const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const PAGE_LIMIT = 1000;
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
  const rows = unwrap(await api('GET', `/apps/${APP_ID}/entities/Guest?q=${q}&limit=${PAGE_LIMIT}`, token));
  if (rows.length >= PAGE_LIMIT) die(`row count reached the ${PAGE_LIMIT} fetch limit — skip pagination is unreliable (gotcha #19). Raise PAGE_LIMIT.`);
  return [...new Map(rows.map(g => [g.id, g])).values()];
}

if (!process.env.RSVP_TOKEN_KEY) die('RSVP_TOKEN_KEY is not set — the round-trip precondition cannot be evaluated.');
if (EXECUTE && EXPECT === null) die('--execute requires --expect-rows=<n> (STANDING-RULES RULE 8).');

const email = process.env.BASE44_TEST_EMAIL, password = process.env.BASE44_TEST_PASSWORD;
if (!email || !password) die('BASE44_TEST_EMAIL / BASE44_TEST_PASSWORD required — Guest.update is owner-scoped.');

const login = await fetch(`${BASE44}/apps/${APP_ID}/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
}).then(r => r.json());
const token = login.access_token, ownerId = login.user?.id;
if (!token || !ownerId) die('login failed');

console.log(`\nTrack E3 — null plaintext tokens — ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
console.log(`owner: ${ownerId}\n`);

const guests = await fetchAllGuests(token, ownerId);
const targets = guests.filter(g => g.rsvp_link_id || g.plus_one_rsvp_link_id);

console.log('SCAN');
console.log(`  guest rows (deduped)          : ${guests.length}`);
console.log(`  rows still holding plaintext  : ${targets.length}`);

// ── the precondition ────────────────────────────────────────────────────────
const unsafe = [];
for (const g of targets) {
  if (g.rsvp_link_id) {
    if (g.rsvp_link_id_hash !== hashToken(g.rsvp_link_id)) unsafe.push({ id: g.id, why: 'primary hash mismatch' });
    else if (decryptToken(g.rsvp_link_id_enc) !== g.rsvp_link_id) unsafe.push({ id: g.id, why: 'primary ciphertext does not round-trip' });
  }
  if (g.plus_one_rsvp_link_id) {
    if (g.plus_one_rsvp_link_id_hash !== hashToken(g.plus_one_rsvp_link_id)) unsafe.push({ id: g.id, why: 'plus-one hash mismatch' });
    else if (decryptToken(g.plus_one_rsvp_link_id_enc) !== g.plus_one_rsvp_link_id) unsafe.push({ id: g.id, why: 'plus-one ciphertext does not round-trip' });
  }
}

console.log('\nPRECONDITION — recovery verified immediately before destruction');
console.log(`  rows whose hash + ciphertext both check out : ${targets.length - new Set(unsafe.map(u => u.id)).size}/${targets.length}`);
if (unsafe.length > 0) {
  for (const u of unsafe.slice(0, 10)) console.log(`    UNSAFE ${u.id}: ${u.why}`);
  die(`${unsafe.length} row(s) failed the round-trip precondition. NOTHING WRITTEN. Nulling these would destroy their only recoverable token.`);
}
console.log('  all target rows are recoverable from ciphertext alone — safe to null');

if (EXPECT !== null && targets.length !== EXPECT) {
  die(`--expect-rows=${EXPECT} but ${targets.length} rows hold plaintext. Nothing written.`);
}

if (!EXECUTE) {
  console.log('\nDRY RUN — no writes performed.');
  console.log(`To execute:  node --env-file=.env.local scripts/null-rsvp-plaintext.mjs --execute --expect-rows=${targets.length}\n`);
  process.exit(0);
}

let ok = 0; const failed = [];
for (const g of targets) {
  const patch = {};
  if (g.rsvp_link_id) patch.rsvp_link_id = null;
  if (g.plus_one_rsvp_link_id) patch.plus_one_rsvp_link_id = null;
  try { await writeWithRetry(`/apps/${APP_ID}/entities/Guest/${g.id}`, token, patch); ok++; }
  catch (err) { failed.push({ id: g.id, error: err.message.slice(0, 120) }); }
  await sleep(WRITE_DELAY_MS);
}
console.log(`\nWRITE  nulled ${ok}/${targets.length}${failed.length ? `, ${failed.length} FAILED` : ''}`);
for (const f of failed) console.log(`  FAIL ${f.id}: ${f.error}`);

const after = await fetchAllGuests(token, ownerId);
const leftover = after.filter(g => g.rsvp_link_id || g.plus_one_rsvp_link_id);
const lostHash = after.filter(g => g.rsvp_link_id_enc && !g.rsvp_link_id_hash);
const recoverable = after.filter(g => g.rsvp_link_id_enc && decryptToken(g.rsvp_link_id_enc));

console.log('\nVERIFY (independent re-read)');
console.log(`  rows still holding plaintext  : ${leftover.length}  ${leftover.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  rows with ciphertext but no hash : ${lostHash.length}  ${lostHash.length === 0 ? 'OK' : 'PROBLEM'}`);
console.log(`  rows still recoverable via decrypt : ${recoverable.length}  ${recoverable.length === targets.length ? 'OK' : 'PROBLEM'}`);
process.exit(leftover.length === 0 && lostHash.length === 0 && failed.length === 0 && recoverable.length === targets.length ? 0 : 1);
